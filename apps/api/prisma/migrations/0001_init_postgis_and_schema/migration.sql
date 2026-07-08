-- Migration: 0001_init_postgis_and_schema
-- Enables PostGIS + citext, creates all tables, adds geometry columns and indexes.

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS citext;

-- Enums
CREATE TYPE "UserRole" AS ENUM ('customer','courier','restaurant_admin','ops_admin','super_admin');
CREATE TYPE "UserStatus" AS ENUM ('active','suspended','deleted','pending');
CREATE TYPE "AuthProvider" AS ENUM ('password','apple','google','phone');
CREATE TYPE "PreferredLanguage" AS ENUM ('en','es');
CREATE TYPE "VehicleType" AS ENUM ('car','scooter','bike','walk');
CREATE TYPE "BackgroundCheckStatus" AS ENUM ('not_started','pending','consider','clear','failed');
CREATE TYPE "W9Status" AS ENUM ('missing','submitted','verified');
CREATE TYPE "MinPayRule" AS ENUM ('none','nyc','ca_prop22','seattle');
CREATE TYPE "OrderStatus" AS ENUM (
  'CREATED','PAYMENT_AUTHORIZED','SENT_TO_RESTAURANT','ACCEPTED','PREPARING',
  'READY_FOR_PICKUP','COURIER_ASSIGNED','COURIER_AT_RESTAURANT','PICKED_UP',
  'EN_ROUTE','ARRIVED','DELIVERED','COMPLETED',
  'REJECTED_BY_RESTAURANT','CANCELLED_BY_CUSTOMER','CANCELLED_BY_OPS','UNDELIVERABLE'
);
CREATE TYPE "DropoffType" AS ENUM ('hand_to_me','leave_at_door');
CREATE TYPE "ActorType" AS ENUM ('customer','courier','restaurant','ops','system');
CREATE TYPE "DispatchEventType" AS ENUM ('offered','accepted','declined','timeout','reassigned');
CREATE TYPE "CourierEarningType" AS ENUM ('base','distance','time','tip','incentive','adjustment','min_pay_topup');
CREATE TYPE "PayoutPeriodStatus" AS ENUM ('open','processing','paid');
CREATE TYPE "ChatSenderType" AS ENUM ('customer','courier','support','system');
CREATE TYPE "MessageLang" AS ENUM ('en','es');
CREATE TYPE "PromoType" AS ENUM ('pct','fixed','free_delivery');
CREATE TYPE "RefundStatus" AS ENUM ('requested','auto_approved','approved','denied');
CREATE TYPE "RefundReason" AS ENUM ('missing_item','wrong_item','quality','late','never_arrived','other');
CREATE TYPE "ConsentType" AS ENUM ('tos','privacy','background_check_fcra','sms_tcpa','location_bg');
CREATE TYPE "TaxDocumentType" AS ENUM ('w9','form_1099_nec','form_1099_k');
CREATE TYPE "SupportTicketStatus" AS ENUM ('open','pending_customer','pending_ops','resolved','closed');
CREATE TYPE "SupportTicketPriority" AS ENUM ('low','normal','high','urgent');

-- users
CREATE TABLE "users" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "role"               "UserRole" NOT NULL,
  "email"              CITEXT UNIQUE,
  "phone"              TEXT UNIQUE,
  "password_hash"      TEXT,
  "auth_provider"      "AuthProvider" NOT NULL,
  "first_name"         TEXT NOT NULL,
  "last_name"          TEXT NOT NULL,
  "preferred_language" "PreferredLanguage" NOT NULL DEFAULT 'en',
  "status"             "UserStatus" NOT NULL DEFAULT 'pending',
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"         TIMESTAMPTZ
);

-- customer_profiles
CREATE TABLE "customer_profiles" (
  "user_id"            UUID PRIMARY KEY REFERENCES "users"("id"),
  "default_address_id" UUID,
  "stripe_customer_id" TEXT,
  "marketing_opt_in"   BOOLEAN NOT NULL DEFAULT FALSE,
  "referral_code"      TEXT UNIQUE
);

-- addresses (with PostGIS geometry)
CREATE TABLE "addresses" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"               UUID NOT NULL REFERENCES "users"("id"),
  "label"                 TEXT,
  "line1"                 TEXT NOT NULL,
  "line2"                 TEXT,
  "city"                  TEXT NOT NULL,
  "state"                 CHAR(2) NOT NULL,
  "zip"                   TEXT NOT NULL,
  "location"              geometry(Point,4326),
  "delivery_instructions" TEXT,
  "is_default"            BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX "addresses_location_gist" ON "addresses" USING GIST ("location");

-- courier_profiles
CREATE TABLE "courier_profiles" (
  "user_id"                   UUID PRIMARY KEY REFERENCES "users"("id"),
  "stripe_connect_account_id" TEXT,
  "vehicle_type"              "VehicleType" NOT NULL,
  "drivers_license_verified"  BOOLEAN NOT NULL DEFAULT FALSE,
  "identity_verified_at"      TIMESTAMPTZ,
  "background_check_status"   "BackgroundCheckStatus" NOT NULL DEFAULT 'not_started',
  "checkr_candidate_id"       TEXT,
  "w9_status"                 "W9Status" NOT NULL DEFAULT 'missing',
  "tin_last4"                 TEXT,
  "insurance_doc_id"          TEXT,
  "home_state"                CHAR(2),
  "active_city_id"            UUID,
  "rating"                    NUMERIC(3,2),
  "completed_deliveries"      INTEGER NOT NULL DEFAULT 0,
  "acceptance_rate"           NUMERIC(5,4),
  "is_online"                 BOOLEAN NOT NULL DEFAULT FALSE,
  "max_concurrent"            INTEGER NOT NULL DEFAULT 2
);

-- cities (with PostGIS service_area)
CREATE TABLE "cities" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"              TEXT NOT NULL,
  "state"             CHAR(2) NOT NULL,
  "timezone"          TEXT NOT NULL,
  "service_area"      geometry(MultiPolygon,4326),
  "is_live"           BOOLEAN NOT NULL DEFAULT FALSE,
  "commission_cap_pct" NUMERIC(5,4),
  "min_pay_rule"      "MinPayRule" NOT NULL DEFAULT 'none',
  "surge_config"      JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX "cities_service_area_gist" ON "cities" USING GIST ("service_area");

-- restaurants (with PostGIS location)
CREATE TABLE "restaurants" (
  "id"                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "city_id"                   UUID NOT NULL REFERENCES "cities"("id"),
  "owner_user_id"             UUID NOT NULL REFERENCES "users"("id"),
  "legal_name"                TEXT NOT NULL,
  "display_name"              TEXT NOT NULL,
  "description"               TEXT,
  "phone"                     TEXT NOT NULL,
  "email"                     TEXT NOT NULL,
  "address_line1"             TEXT NOT NULL,
  "address_line2"             TEXT,
  "address_city"              TEXT NOT NULL,
  "address_state"             CHAR(2) NOT NULL,
  "address_zip"               TEXT NOT NULL,
  "location"                  geometry(Point,4326),
  "cuisine_tags"              TEXT[] NOT NULL DEFAULT '{}',
  "price_level"               INTEGER NOT NULL DEFAULT 2,
  "commission_pct"            NUMERIC(5,4) NOT NULL,
  "stripe_connect_account_id" TEXT,
  "w9_status"                 "W9Status" NOT NULL DEFAULT 'missing',
  "avg_prep_minutes"          INTEGER NOT NULL DEFAULT 20,
  "rating"                    NUMERIC(3,2) NOT NULL DEFAULT 0,
  "rating_count"              INTEGER NOT NULL DEFAULT 0,
  "is_active"                 BOOLEAN NOT NULL DEFAULT FALSE,
  "is_accepting_orders"       BOOLEAN NOT NULL DEFAULT FALSE,
  "auto_accept"               BOOLEAN NOT NULL DEFAULT FALSE,
  "hours"                     JSONB NOT NULL DEFAULT '{}',
  "holiday_overrides"         JSONB NOT NULL DEFAULT '{}',
  "created_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "restaurants_location_gist" ON "restaurants" USING GIST ("location");
CREATE INDEX "restaurants_city_active" ON "restaurants" ("city_id", "is_active", "is_accepting_orders");

-- menus
CREATE TABLE "menus" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL REFERENCES "restaurants"("id"),
  "name"          TEXT NOT NULL,
  "active"        BOOLEAN NOT NULL DEFAULT TRUE
);

-- menu_categories
CREATE TABLE "menu_categories" (
  "id"      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "menu_id" UUID NOT NULL REFERENCES "menus"("id"),
  "name"    TEXT NOT NULL,
  "sort"    INTEGER NOT NULL DEFAULT 0
);

-- menu_items
CREATE TABLE "menu_items" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "category_id"  UUID NOT NULL REFERENCES "menu_categories"("id"),
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "price_cents"  INTEGER NOT NULL,
  "image_url"    TEXT,
  "is_available" BOOLEAN NOT NULL DEFAULT TRUE,
  "tax_code"     TEXT,
  "dietary_tags" TEXT[] NOT NULL DEFAULT '{}',
  "sort"         INTEGER NOT NULL DEFAULT 0
);

-- modifier_groups
CREATE TABLE "modifier_groups" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL REFERENCES "restaurants"("id"),
  "name"          TEXT NOT NULL,
  "min_select"    INTEGER NOT NULL DEFAULT 0,
  "max_select"    INTEGER NOT NULL DEFAULT 1
);

-- modifiers
CREATE TABLE "modifiers" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_id"          UUID NOT NULL REFERENCES "modifier_groups"("id"),
  "name"              TEXT NOT NULL,
  "price_delta_cents" INTEGER NOT NULL DEFAULT 0,
  "is_available"      BOOLEAN NOT NULL DEFAULT TRUE
);

-- item_modifier_groups
CREATE TABLE "item_modifier_groups" (
  "item_id"  UUID NOT NULL REFERENCES "menu_items"("id"),
  "group_id" UUID NOT NULL REFERENCES "modifier_groups"("id"),
  "sort"     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("item_id","group_id")
);

-- orders (with PostGIS delivery_location)
CREATE TABLE "orders" (
  "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "public_code"             TEXT UNIQUE NOT NULL,
  "customer_id"             UUID NOT NULL REFERENCES "users"("id"),
  "restaurant_id"           UUID NOT NULL REFERENCES "restaurants"("id"),
  "courier_id"              UUID,
  "city_id"                 UUID NOT NULL REFERENCES "cities"("id"),
  "status"                  "OrderStatus" NOT NULL DEFAULT 'CREATED',
  "subtotal_cents"          INTEGER NOT NULL,
  "delivery_fee_cents"      INTEGER NOT NULL,
  "service_fee_cents"       INTEGER NOT NULL,
  "small_order_fee_cents"   INTEGER NOT NULL DEFAULT 0,
  "surge_cents"             INTEGER NOT NULL DEFAULT 0,
  "tip_cents"               INTEGER NOT NULL DEFAULT 0,
  "tax_cents"               INTEGER NOT NULL,
  "discount_cents"          INTEGER NOT NULL DEFAULT 0,
  "total_cents"             INTEGER NOT NULL,
  "delivery_address"        JSONB NOT NULL,
  "delivery_location"       geometry(Point,4326),
  "dropoff_type"            "DropoffType" NOT NULL DEFAULT 'hand_to_me',
  "scheduled_for"           TIMESTAMPTZ,
  "stripe_payment_intent_id" TEXT,
  "tax_calculation_id"      TEXT,
  "estimated_delivery_at"   TIMESTAMPTZ,
  "delivered_at"            TIMESTAMPTZ,
  "proof_photo_url"         TEXT,
  "cancellation"            JSONB,
  "created_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "orders_delivery_location_gist" ON "orders" USING GIST ("delivery_location");
CREATE INDEX "orders_restaurant_status" ON "orders" ("restaurant_id","status");
CREATE INDEX "orders_courier_status" ON "orders" ("courier_id","status");

-- order_items
CREATE TABLE "order_items" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id"        UUID NOT NULL REFERENCES "orders"("id"),
  "menu_item_id"    UUID NOT NULL REFERENCES "menu_items"("id"),
  "name_snapshot"   TEXT NOT NULL,
  "qty"             INTEGER NOT NULL,
  "unit_price_cents" INTEGER NOT NULL,
  "modifiers"       JSONB NOT NULL DEFAULT '[]',
  "note"            TEXT
);

-- order_events
CREATE TABLE "order_events" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id"    UUID NOT NULL REFERENCES "orders"("id"),
  "from_status" "OrderStatus",
  "to_status"   "OrderStatus" NOT NULL,
  "actor_type"  "ActorType" NOT NULL,
  "actor_id"    UUID,
  "metadata"    JSONB NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "order_events_order_id" ON "order_events" ("order_id");

-- dispatch_events
CREATE TABLE "dispatch_events" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id"       UUID NOT NULL REFERENCES "orders"("id"),
  "courier_id"     UUID NOT NULL,
  "type"           "DispatchEventType" NOT NULL,
  "pay_offer_cents" INTEGER NOT NULL,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "dispatch_events_order_id" ON "dispatch_events" ("order_id");

-- courier_shifts
CREATE TABLE "courier_shifts" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "courier_id" UUID NOT NULL REFERENCES "courier_profiles"("user_id"),
  "city_id"    UUID NOT NULL REFERENCES "cities"("id"),
  "started_at" TIMESTAMPTZ NOT NULL,
  "ended_at"   TIMESTAMPTZ
);

-- courier_location_pings (partitioned by day for 30-day retention)
CREATE TABLE "courier_location_pings" (
  "courier_id"  UUID NOT NULL,
  "order_id"    UUID,
  "location"    geometry(Point,4326) NOT NULL,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("courier_id","recorded_at")
) PARTITION BY RANGE ("recorded_at");
CREATE INDEX "courier_location_pings_location_gist"
  ON "courier_location_pings" USING GIST ("location");

-- courier_earnings
CREATE TABLE "courier_earnings" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "courier_id"   UUID NOT NULL REFERENCES "courier_profiles"("user_id"),
  "order_id"     UUID,
  "type"         "CourierEarningType" NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "period_id"    UUID,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- payout_periods
CREATE TABLE "payout_periods" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "courier_id"       UUID NOT NULL REFERENCES "courier_profiles"("user_id"),
  "week_start"       DATE NOT NULL,
  "gross_cents"      INTEGER NOT NULL DEFAULT 0,
  "status"           "PayoutPeriodStatus" NOT NULL DEFAULT 'open',
  "stripe_transfer_id" TEXT
);

-- instant_payouts
CREATE TABLE "instant_payouts" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "courier_id"       UUID NOT NULL REFERENCES "courier_profiles"("user_id"),
  "amount_cents"     INTEGER NOT NULL,
  "fee_cents"        INTEGER NOT NULL,
  "stripe_payout_id" TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- chat_threads
CREATE TABLE "chat_threads" (
  "id"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID UNIQUE NOT NULL REFERENCES "orders"("id")
);

-- chat_messages
CREATE TABLE "chat_messages" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "thread_id"       UUID NOT NULL REFERENCES "chat_threads"("id"),
  "sender_type"     "ChatSenderType" NOT NULL,
  "sender_id"       UUID,
  "original_text"   TEXT NOT NULL,
  "original_lang"   "MessageLang" NOT NULL,
  "translated_text" TEXT,
  "translated_lang" "MessageLang",
  "translation_ms"  INTEGER,
  "delivered_at"    TIMESTAMPTZ,
  "read_at"         TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "chat_messages_thread_created" ON "chat_messages" ("thread_id","created_at");

-- promos
CREATE TABLE "promos" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code"             TEXT UNIQUE NOT NULL,
  "type"             "PromoType" NOT NULL,
  "value"            NUMERIC(10,4) NOT NULL,
  "min_subtotal_cents" INTEGER,
  "max_uses"         INTEGER,
  "per_user_limit"   INTEGER NOT NULL DEFAULT 1,
  "first_order_only" BOOLEAN NOT NULL DEFAULT FALSE,
  "city_ids"         UUID[] NOT NULL DEFAULT '{}',
  "starts_at"        TIMESTAMPTZ NOT NULL,
  "ends_at"          TIMESTAMPTZ NOT NULL,
  "budget_cents"     INTEGER
);

-- promo_redemptions
CREATE TABLE "promo_redemptions" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "promo_id"     UUID NOT NULL REFERENCES "promos"("id"),
  "order_id"     UUID NOT NULL REFERENCES "orders"("id"),
  "user_id"      UUID NOT NULL REFERENCES "users"("id"),
  "amount_cents" INTEGER NOT NULL,
  UNIQUE ("promo_id","user_id","order_id")
);

-- ratings
CREATE TABLE "ratings" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id"         UUID NOT NULL REFERENCES "orders"("id"),
  "restaurant_stars" INTEGER CHECK ("restaurant_stars" BETWEEN 1 AND 5),
  "courier_stars"    INTEGER CHECK ("courier_stars" BETWEEN 1 AND 5),
  "comment"          TEXT,
  "flagged"          BOOLEAN NOT NULL DEFAULT FALSE
);

-- refunds
CREATE TABLE "refunds" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id"         UUID NOT NULL REFERENCES "orders"("id"),
  "requested_by"     UUID NOT NULL,
  "reason"           "RefundReason" NOT NULL,
  "evidence_urls"    TEXT[] NOT NULL DEFAULT '{}',
  "amount_cents"     INTEGER NOT NULL,
  "status"           "RefundStatus" NOT NULL DEFAULT 'requested',
  "resolver_id"      UUID,
  "stripe_refund_id" TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- support_tickets
CREATE TABLE "support_tickets" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL REFERENCES "users"("id"),
  "order_id"    UUID,
  "channel"     TEXT NOT NULL,
  "subject"     TEXT NOT NULL,
  "status"      "SupportTicketStatus" NOT NULL DEFAULT 'open',
  "priority"    "SupportTicketPriority" NOT NULL DEFAULT 'normal',
  "assignee_id" UUID,
  "transcript"  JSONB NOT NULL DEFAULT '[]',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tax_documents
CREATE TABLE "tax_documents" (
  "id"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"  UUID NOT NULL REFERENCES "users"("id"),
  "year"     INTEGER NOT NULL,
  "type"     "TaxDocumentType" NOT NULL,
  "file_url" TEXT NOT NULL,
  "status"   TEXT NOT NULL
);

-- consents
CREATE TABLE "consents" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL REFERENCES "users"("id"),
  "type"       "ConsentType" NOT NULL,
  "version"    TEXT NOT NULL,
  "ip"         TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_logs
CREATE TABLE "audit_logs" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id"   UUID NOT NULL REFERENCES "users"("id"),
  "action"     TEXT NOT NULL,
  "entity"     TEXT NOT NULL,
  "entity_id"  TEXT NOT NULL,
  "before"     JSONB,
  "after"      JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- webhook_events (idempotent Stripe/Checkr handling)
CREATE TABLE "webhook_events" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider"     TEXT NOT NULL,
  "event_id"     TEXT UNIQUE NOT NULL,
  "payload"      JSONB NOT NULL,
  "processed_at" TIMESTAMPTZ
);

-- feature_flags
CREATE TABLE "feature_flags" (
  "key"     TEXT PRIMARY KEY,
  "value"   JSONB NOT NULL,
  "city_id" UUID
);
