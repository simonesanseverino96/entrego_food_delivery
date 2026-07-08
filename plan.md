# DELIVERY PLATFORM — FULL PRODUCTION SPECIFICATION (plan.md)

> **Purpose of this document**: This is the single source of truth for building a complete, production-grade,
> three-sided food delivery platform (like Glovo/Deliveroo/DoorDash) for the **United States market only**.
> It is written to be executed by Claude Code, phase by phase (see §16). It is NOT an MVP spec:
> every feature listed here is in scope for the 1.0 public release on the Apple App Store,
> Google Play Store, and the web.

---

## 1. VISION & SCOPE

**Product name (working title)**: _(to be defined — placeholder: "Entrego")_

**One-liner**: A three-sided food delivery marketplace (Customers ↔ Restaurants ↔ Couriers) operating in the
United States, with a real-time AI-translated chat between English-speaking customers and Spanish-speaking
(Venezuelan) couriers as a core differentiator.

**Platforms at launch (all mandatory)**:

1. **Customer app** — iOS + Android (React Native / Expo) + responsive web ordering (Next.js).
2. **Courier app** — iOS + Android (React Native / Expo). No web version.
3. **Restaurant dashboard** — Web (Next.js), tablet-optimized. Works on iPad/Android tablets via browser.
4. **Admin panel** — Web (Next.js), internal only, behind SSO + 2FA.

**Market**: USA only. Launch city-by-city (delivery is a hyperlocal business). **Launch market (client decision):
Bluffton, South Carolina** (Beaufort County, Lowcountry). Market characteristics that shape the product:

- Fast-growing town (~40k) with a large and growing Hispanic community working in the area's hospitality economy —
  the EN↔ES chat translation is directly relevant. Note: the local Spanish-speaking community is predominantly
  Mexican/Central American rather than Venezuelan; the translation prompt keeps the Venezuelan register per client
  requirement, but is versioned so the vocabulary block can be tuned to local usage after launch (see §9.3).
- Suburban/low-density geography: car couriers dominant, longer average distances than a dense city →
  delivery-fee-by-distance and batching matter more; the dispatch radius defaults must be wider (2→5→8 miles).
- Strong seasonality from Hilton Head Island tourism next door → surge config and courier incentives per season.
- **Expansion path built into the city model**: Bluffton → Hilton Head Island → Beaufort/Okatie → Savannah, GA
  (30 min away — NOTE: Georgia = a second state: separate sales-tax registration and compliance checklist before
  activation; the per-city launch checklist in admin (§17.6) gates this).
  The system must be architected multi-city/multi-state from day one (city entity, per-state compliance flags,
  per-jurisdiction tax logic).

**Explicitly OUT of scope for 1.0** (legal risk containment — do not build):

- Alcohol, tobacco, cannabis, pharmacy/Rx delivery (each requires separate state licensing).
- Cash on delivery (fraud + courier safety).
- Grocery/large-basket picking (different ops model).
- International markets, currencies other than USD, languages in the customer UI other than English and Spanish.

---

## 2. BUSINESS MODEL & UNIT ECONOMICS

### 2.1 Revenue streams

| Stream                               | Mechanism                                              | Notes                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Restaurant commission                | 15–30% of order subtotal, tiered by plan               | **Hard-capped by law in some cities (NYC 15%+8%, SF 15%)** — commission must be a per-jurisdiction config, never hardcoded                     |
| Customer delivery fee                | Dynamic $1.99–$7.99 by distance/demand                 | Surge multiplier configurable per zone                                                                                                         |
| Customer service fee                 | % of subtotal (e.g. 15%, capped)                       | Must be displayed pre-checkout (FTC "junk fees" rule: all mandatory fees shown up-front in the listed price — total-price disclosure required) |
| Small order fee                      | Flat fee under minimum basket                          |                                                                                                                                                |
| Subscription ("Plus")                | $9.99/mo — free delivery over $15, reduced service fee | Stripe Billing; must support easy one-click cancellation (FTC Negative Option / click-to-cancel rule)                                          |
| Restaurant ads / sponsored placement | CPC or flat placement in search results                | Must be labeled "Sponsored"                                                                                                                    |
| Priority delivery                    | +$2.99 customer option                                 |                                                                                                                                                |

### 2.2 Cost structure (must be modeled in the admin finance module)

- Courier payout per delivery (base pay + distance + time + 100% of tips + incentives/quests).
- Payment processing (Stripe: 2.9% + $0.30; Connect payout fees).
- Maps/geo APIs (Google Maps Platform or Mapbox — at scale this is thousands of $/month; the architecture must
  cache geocoding results and use Mapbox where cheaper).
- LLM translation API (per-message; see §9 for cost controls).
- SMS (Twilio Verify), push (free via FCM/APNs), email (Resend/SES).
- Background checks (Checkr: ~$30–80 per courier onboarded).
- Occupational accident insurance for couriers + contingent auto liability (state-dependent; budget line, not code).
- Customer support tooling and refund/appeasement budget (target < 1.5% of GMV).

### 2.3 Unit economics target (admin dashboard KPI)

Per-order contribution margin = (commission + customer fees + ads) − (courier payout ex-tip + processing + support cost).
Target ≥ $2.00/order by month 6 in launch city. The admin panel must compute and chart this daily.

---

## 3. TECH STACK (DEFINITIVE)

**Philosophy**: one language (TypeScript) end-to-end, one monorepo, boring proven infrastructure,
modular monolith backend (NOT microservices — split later only if a module demonstrably needs it).

### 3.1 Monorepo

- **Tooling**: pnpm workspaces + Turborepo.
- Structure:

```
/apps
  /customer-mobile     → Expo (React Native, TypeScript)
  /courier-mobile      → Expo (React Native, TypeScript)
  /web                 → Next.js 15+ App Router (customer web ordering + marketing site, SSR/SEO)
  /restaurant-web      → Next.js (restaurant dashboard, SPA-style, protected)
  /admin-web           → Next.js (internal admin, SSO + 2FA)
  /api                 → NestJS (modular monolith) — REST + WebSocket gateways
/packages
  /shared              → zod schemas, DTOs, TS types shared client/server (single source of truth)
  /ui                  → shared RN components (customer+courier), design tokens
  /config              → eslint, tsconfig, tailwind presets
/infra                 → IaC (Terraform or SST), Dockerfiles, GitHub Actions workflows
```

### 3.2 Mobile

- **Expo SDK (latest stable) + EAS Build/Submit/Update** for both stores.
- Navigation: Expo Router. State: Zustand + TanStack Query. Forms: react-hook-form + zod.
- Maps: `react-native-maps` (Google provider on Android, Apple Maps or Google on iOS) or Mapbox RN SDK
  (decide in Phase 1 spike; Mapbox is cheaper at scale and has better in-app turn-by-turn navigation for couriers).
- Background location (courier app only): `expo-location` + `expo-task-manager` with foreground service on Android
  ("while in use" + prominent disclosure — see store compliance §12).
- Push: `expo-notifications` (FCM + APNs). Payments UI: `@stripe/stripe-react-native` (Apple Pay / Google Pay).
- OTA updates: EAS Update for JS-only hotfixes (respecting store policies).

### 3.3 Backend

- **NestJS (TypeScript)** modular monolith. Modules: auth, users, restaurants, catalog, cart, orders, dispatch,
  tracking, chat, translation, payments, payouts, tax, promos, ratings, notifications, support, compliance, admin.
- **API style**: REST (OpenAPI generated) + WebSocket (Socket.IO with Redis adapter) for realtime.
- **ORM**: Prisma (Postgres) + raw SQL for PostGIS queries (Prisma doesn't natively cover all geo operators).
- **Jobs/queues**: BullMQ (Redis) — dispatch retries, payout batches, receipt emails, 1099 generation, ETA recompute.
- **Validation**: zod at the edge, shared with clients via `/packages/shared`.

### 3.4 Data layer

- **PostgreSQL 16 + PostGIS** (managed: AWS RDS or Neon/Supabase at start; must be swappable).
  - GIST indexes on all geo columns; `ST_DWithin` for radius queries; geofenced delivery zones as polygons.
- **Redis** (ElastiCache/Upstash): courier live locations (`GEOADD`/`GEOSEARCH`), Socket.IO pub/sub adapter,
  rate limiting, dispatch locks, hot config cache.
- **S3-compatible object storage**: menu photos, delivery proof photos (with GPS EXIF stripped before serving,
  retained raw for disputes 90 days), courier documents (encrypted bucket, restricted IAM).
- **Search**: Postgres full-text + trigram for 1.0 (Meilisearch/Typesense only if needed later).

### 3.5 Infrastructure & DevOps

- Containers on **AWS ECS Fargate** (or Railway/Fly.io for the first city, with a documented migration path).
- CDN + WAF: Cloudflare. DNS: Route53/Cloudflare.
- CI/CD: GitHub Actions → typecheck, lint, unit tests, integration tests (Testcontainers Postgres+Redis),
  Docker build, deploy staging → manual gate → production. Mobile: EAS Build + EAS Submit pipelines.
- Environments: `local` (docker-compose: postgres+postgis, redis, localstack S3, stripe CLI), `staging`, `production`.
- Observability: Sentry (all apps), OpenTelemetry traces, Grafana/CloudWatch dashboards, uptime checks,
  PagerDuty-style alerting on: order stuck > X min, dispatch failure rate, WebSocket disconnect spikes, payment error rate.
- Secrets: AWS Secrets Manager / Doppler. No secrets in repo, ever.

### 3.6 Third-party services (accounts to open — human task, not code)

Stripe (Connect + Billing + Tax + Identity + Radar), Checkr (background checks, FCRA-compliant flow),
Twilio Verify (SMS OTP), Resend or SES (email), Google Maps Platform and/or Mapbox, Sentry,
Apple Developer Program ($99/yr), Google Play Console ($25 one-off), LLM provider (Anthropic and/or OpenAI) for translation.

---

## 4. SYSTEM ARCHITECTURE

```
[Customer iOS/Android] [Customer Web] [Courier iOS/Android] [Restaurant Web] [Admin Web]
        \                |                  |                     |             /
         \               |                  |                     |            /
          +---------- Cloudflare (CDN, WAF, TLS) -----------------------------+
                                   |
                        [ NestJS API (ECS Fargate, N replicas) ]
                        REST /api/v1/*        WS /ws (Socket.IO)
                                   |
      +--------------+-------------+--------------+----------------+
      |              |             |              |                |
 [PostgreSQL     [Redis]      [BullMQ        [S3 buckets]    [3rd parties]
  + PostGIS]   geo/pubsub/     workers]      media/docs      Stripe, Checkr,
  RDS Multi-AZ  cache/locks   (same image,                   Twilio, Maps,
                               worker mode)                   LLM translate
```

**Realtime model**:

- Courier app → WS `location:update` every 4s while online (batched; falls back to REST if WS down).
- API writes to Redis GEO (`courier:live` keyset per city) + appends to `courier_location_pings` (partitioned table, 30-day retention) for compliance/pay-time calculations.
- Customers subscribed to `order:{id}` room receive courier position (throttled to 1 msg/3s), status changes, chat messages.
- Restaurant dashboard subscribed to `restaurant:{id}` room: new orders (with un-dismissable audio alert), cancellations.

**Dispatch (order → courier matching)** — deterministic, testable module:

1. Trigger: restaurant accepts order (or auto-accept timeout), or food-ready ETA minus pickup travel time.
2. Candidate set: Redis `GEOSEARCH` couriers online in city, radius expanding 1→3→6 miles, filtered by: not on max concurrent orders, vehicle type ok, acceptance not locked.
3. Scoring: distance to restaurant, current load, historical completion rate, time since last offer (fairness).
4. Offer sent to best candidate: 30s TTL (Redis lock `offer:{orderId}` prevents double-offer). Decline/timeout → next candidate. After N rounds → widen radius, raise incentive, alert ops.
5. Batching (stacked orders): if second order same restaurant/route within thresholds, offer as batch with combined pay.
6. Every offer, accept, decline, reassignment is persisted (`dispatch_events`) for audit and pay disputes.

**Order state machine (single source of truth, enforced server-side)**:
`CREATED → PAYMENT_AUTHORIZED → SENT_TO_RESTAURANT → ACCEPTED → PREPARING → READY_FOR_PICKUP → COURIER_ASSIGNED → COURIER_AT_RESTAURANT → PICKED_UP → EN_ROUTE → ARRIVED → DELIVERED → COMPLETED`
plus terminal branches: `REJECTED_BY_RESTAURANT`, `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_OPS`, `UNDELIVERABLE` (each with refund policy matrix in §7.6). Illegal transitions must throw; every transition is an event row (`order_events`) with actor + timestamp — this event log drives analytics, courier pay time, and dispute resolution.

---

## 5. DATABASE SCHEMA (CORE — Prisma + raw PostGIS)

All money in **integer cents**. All timestamps `timestamptz`. Soft deletes only where legally required to retain.

```
users(id uuid pk, role enum[customer,courier,restaurant_admin,ops_admin,super_admin], email citext unique,
      phone e164 unique, password_hash nullable, auth_provider enum[password,apple,google,phone],
      first_name, last_name, preferred_language enum[en,es], status enum[active,suspended,deleted,pending],
      created_at, deleted_at)  -- deletion = anonymization job (CCPA), see §11

customer_profiles(user_id fk, default_address_id, stripe_customer_id, marketing_opt_in bool, referral_code)

addresses(id, user_id, label, line1, line2, city, state char(2), zip, location geometry(Point,4326),
          delivery_instructions text, is_default)

courier_profiles(user_id fk, stripe_connect_account_id, vehicle_type enum[car,scooter,bike,walk],
     drivers_license_verified bool, identity_verified_at,          -- Stripe Identity
     background_check_status enum[not_started,pending,consider,clear,failed], checkr_candidate_id,
     w9_status enum[missing,submitted,verified], tin_last4, insurance_doc_id nullable,
     home_state char(2), active_city_id fk, rating numeric, completed_deliveries int,
     acceptance_rate numeric, is_online bool, max_concurrent int default 2)

cities(id, name, state char(2), timezone, service_area geometry(MultiPolygon,4326), is_live bool,
       commission_cap_pct nullable, min_pay_rule enum[none,nyc,ca_prop22,seattle], surge_config jsonb)

restaurants(id, city_id, owner_user_id, legal_name, display_name, description, phone, email,
     address fields + location geometry(Point,4326), cuisine_tags text[], price_level int,
     commission_pct numeric,            -- validated against cities.commission_cap_pct
     stripe_connect_account_id, w9_status, avg_prep_minutes int, rating numeric, rating_count int,
     is_active bool, is_accepting_orders bool, auto_accept bool, hours jsonb, holiday_overrides jsonb)

menus(id, restaurant_id, name, active)
menu_categories(id, menu_id, name, sort)
menu_items(id, category_id, name, description, price_cents, image_url, is_available bool,
           tax_code text,               -- Stripe Tax product tax code
           dietary_tags text[], sort)
modifier_groups(id, restaurant_id, name, min_select, max_select)
modifiers(id, group_id, name, price_delta_cents, is_available)
item_modifier_groups(item_id, group_id, sort)

orders(id, public_code text unique,     -- short code shown to all parties
   customer_id, restaurant_id, courier_id nullable, city_id, status enum(see §4),
   subtotal_cents, delivery_fee_cents, service_fee_cents, small_order_fee_cents, surge_cents,
   tip_cents, tax_cents, discount_cents, total_cents,
   delivery_address jsonb snapshot, delivery_location geometry(Point,4326),
   dropoff_type enum[hand_to_me,leave_at_door], scheduled_for timestamptz nullable,
   stripe_payment_intent_id, tax_calculation_id,   -- Stripe Tax
   estimated_delivery_at, delivered_at, proof_photo_url nullable, cancellation jsonb nullable,
   created_at)   -- + GIST index on delivery_location, composite indexes on (restaurant_id,status),(courier_id,status)

order_items(id, order_id, menu_item_id, name_snapshot, qty, unit_price_cents, modifiers jsonb snapshot, note)
order_events(id, order_id, from_status, to_status, actor_type, actor_id, metadata jsonb, created_at)
dispatch_events(id, order_id, courier_id, type enum[offered,accepted,declined,timeout,reassigned], pay_offer_cents, created_at)

courier_shifts(id, courier_id, city_id, started_at, ended_at)        -- online sessions
courier_location_pings(courier_id, order_id nullable, location geometry(Point,4326), recorded_at)
   -- PARTITIONED BY day, 30-day retention job; feeds min-pay "active time" calculations

courier_earnings(id, courier_id, order_id nullable, type enum[base,distance,time,tip,incentive,adjustment,min_pay_topup],
                 amount_cents, period_id, created_at)
payout_periods(id, courier_id, week_start, gross_cents, status enum[open,processing,paid], stripe_transfer_id)
instant_payouts(id, courier_id, amount_cents, fee_cents, stripe_payout_id, created_at)

chat_threads(id, order_id unique)      -- also: support threads with thread_type
chat_messages(id, thread_id, sender_type enum[customer,courier,support,system], sender_id,
   original_text, original_lang enum[en,es], translated_text nullable, translated_lang nullable,
   translation_ms int nullable, delivered_at, read_at, created_at)

promos(id, code, type enum[pct,fixed,free_delivery], value, min_subtotal_cents, max_uses, per_user_limit,
       first_order_only bool, city_ids uuid[], starts_at, ends_at, budget_cents)
promo_redemptions(id, promo_id, order_id, user_id, amount_cents)

ratings(id, order_id, rater enum[customer], restaurant_stars int nullable, courier_stars int nullable,
        comment, flagged bool)

refunds(id, order_id, requested_by, reason enum[missing_item,wrong_item,quality,late,never_arrived,other],
        evidence_urls text[], amount_cents, status enum[requested,auto_approved,approved,denied],
        resolver_id nullable, stripe_refund_id, created_at)

support_tickets(id, user_id, order_id nullable, channel, subject, status, priority, assignee_id, transcript jsonb)

tax_documents(id, user_id, year, type enum[w9,1099nec,1099k], file_url encrypted, status)
consents(id, user_id, type enum[tos,privacy,background_check_fcra,sms_tcpa,location_bg], version, ip, created_at)
audit_logs(id, admin_id, action, entity, entity_id, before jsonb, after jsonb, created_at)
webhook_events(id, provider, event_id unique, payload jsonb, processed_at)   -- idempotent Stripe/Checkr handling
feature_flags(key, value jsonb, city_id nullable)
```

**Canonical geo query** (restaurants within radius, open now, ranked):

```sql
SELECT r.*, ST_Distance(r.location::geography, ST_MakePoint($lng,$lat)::geography) AS meters
FROM restaurants r
WHERE r.is_active AND r.is_accepting_orders
  AND ST_DWithin(r.location::geography, ST_MakePoint($lng,$lat)::geography, $radius_m)
ORDER BY (meters * w1) - (r.rating * w2) - (popularity_score * w3)
LIMIT 50;
```

---

## 6. FEATURE SPECIFICATION — CUSTOMER (mobile + web, full parity except where noted)

### 6.1 Auth & account

- Sign up / sign in: phone OTP (Twilio Verify), email+password, **Sign in with Apple (mandatory on iOS because Google sign-in is offered)**, Google.
- Profile, saved addresses (with entry instructions per address), saved payment methods (Stripe SetupIntent), language preference EN/ES (full UI i18n from day 1 — react-i18next / next-intl).
- **In-app account deletion** (Apple/Google hard requirement): self-serve flow → anonymization job ≤30 days, immediate logout, confirmation email. Order/tax records retained as legally required (documented in privacy policy).

### 6.2 Discovery & search

- Home feed by delivery address: carousels (Featured/Sponsored [labeled], New, Fastest, Top rated), category chips.
- Search with typo tolerance across restaurants + dishes; filters: distance, rating, price level, dietary tags, open now; sort: recommended, delivery time, rating, distance.
- Restaurant page: hero, rating + count, fees + ETA up-front, full menu with categories, item sheet with modifier groups (min/max enforced), item notes, allergen disclaimer text.
- ETA shown pre-order = prep estimate + dispatch estimate + travel (recomputed live after order).

### 6.3 Cart & checkout

- One active cart per restaurant; multi-restaurant cart switch warning. Cross-device cart sync (server-side cart).
- Fee transparency: itemized subtotal, delivery fee, service fee, small-order fee, **estimated tax (Stripe Tax by delivery address)**, tip, total — all BEFORE payment (FTC total-price compliance).
- Tip selector: 15% / 18% / 20% / custom / none, editable up to 1h post-delivery (increase only).
- Payment: Apple Pay, Google Pay, cards (Stripe PaymentSheet). Auth-then-capture: authorize at order, capture at DELIVERED (handles cancellations cleanly). Stripe Radar for fraud.
- Scheduled orders (up to 4 days ahead), delivery vs pickup toggle, promo code field, referral credits auto-apply.
- Group order links (shared cart via deep link) — **web + mobile**.

### 6.4 Live order experience

- Status timeline with the full state machine, live map with courier marker (3s throttle), live ETA.
- Chat with courier (translated — §9) enabled from COURIER_ASSIGNED to +15 min post-delivery. Masked VoIP-free calling via Twilio Proxy number (no personal numbers exposed) as fallback.
- Push notifications for every state change; SMS fallback for DELIVERED/problem states (TCPA consent captured at signup).
- Delivery proof photo shown for leave-at-door.

### 6.5 Post-order

- Rate courier + restaurant (separate), item-level "something wrong?" flow → §7.6 refunds.
- Receipts (email + in-app, tax breakdown), full order history, one-tap reorder.
- Referral program (give $X get $X, fraud-checked: device fingerprint + Radar), loyalty/Plus subscription management with one-click cancel.

### 6.6 Customer web (Next.js) specifics

- SEO: SSR restaurant pages `/[city]/[restaurant-slug]`, sitemap, schema.org `Restaurant`/`Menu` structured data, Core Web Vitals budget.
- Full ordering parity, Stripe Payment Element, responsive; marketing pages (About, Couriers recruiting page, Restaurant partners page, Legal).
- **WCAG 2.1 AA mandatory** (§11.4).

## 7. FEATURE SPECIFICATION — COURIER APP

### 7.1 Onboarding (fully in-app, gated pipeline; EN/ES UI — Spanish first-class)

1. Account + phone verification → 2. City + vehicle type → 3. **Stripe Identity** (ID document + selfie) →
2. Driver's license capture (if car/scooter) → 5. **FCRA-compliant background check**: standalone disclosure screen, written consent (stored in `consents`), Checkr invitation; webhook updates status; if "consider/failed" → automated **pre-adverse action** notice with report copy + dispute window before final adverse action (this exact flow is a legal requirement — implement precisely) →
3. **W-9 digital form** (legal name, entity type, TIN — encrypted at rest, tokenized, never logged) →
4. **Stripe Connect Express** account creation (payouts) → 8. Training modules + quiz (food safety, app usage) → 9. Activation.
   Each step resumable; ops can see funnel in admin.

### 7.2 Working

- Go Online/Offline toggle; heatmap of demand zones; scheduled shifts optional (priority access in busy zones).
- **Offer screen**: guaranteed minimum pay (base + est. tip separately — pay transparency laws require the breakdown), pickup + dropoff pins, total miles, est. total time, 30s animated countdown, Accept/Decline (no penalty narrative but acceptance_rate tracked), batch offers clearly marked.
- Active delivery flow: navigate to restaurant (in-app turn-by-turn — Mapbox Navigation SDK — with "open in Google Maps/Waze" escape hatch), arrival auto-detected by geofence, pickup confirmation (order code + item checklist), navigate to customer, arrival notification auto-sent, completion:
  - _Hand to me_: tap confirm (+ optional customer PIN for high-value orders).
  - _Leave at door_: mandatory photo (uploaded to S3, GPS-verified within geofence).
- Chat with customer (translated §9) and with support. Issue reporting: restaurant closed, customer unreachable (starts 8-min timer + automated calls before UNDELIVERABLE), spill/accident.

### 7.3 Earnings & taxes

- Wallet: today/week/lifetime, per-delivery breakdown (base, distance, time, tip, incentives, **min-pay top-ups** where city law applies — NYC/Seattle/CA computed from `courier_location_pings` active time).
- Weekly automatic payout (Stripe Connect transfer) + **Instant Payout** ($0.50-style fee) to debit card.
- Quests/incentives (e.g., "+$30 for 12 deliveries Fri–Sun") configured from admin.
- Tax center: yearly earnings summary, **1099-NEC/1099-K auto-generation & e-delivery via Stripe Connect tax forms**, mileage log export (CSV).

### 7.4 Safety & account

- Emergency button (911 deep link + live location share with ops), incident reporting, insurance info screen.
- Ratings received, completion/acceptance stats, deactivation appeals flow (human review — required by platform-work fairness laws in some jurisdictions).

## 7.5 FEATURE SPECIFICATION — RESTAURANT DASHBOARD (Next.js, tablet-first)

- **Live order board**: New (accept/reject with reason + prep-time selector) | In preparation | Ready for pickup. Persistent audio alarm for new orders until acknowledged; auto-accept mode; courier arrival banner with courier name/photo.
- Menu manager: CRUD categories/items/modifiers, photo upload (auto-resize), **"86" toggle** (out of stock: today vs indefinitely), bulk CSV import, scheduled price changes.
- Hours & holiday overrides, temporary pause ("busy — pause 30/60 min"), prep-time defaults by daypart.
- Finance: daily/weekly sales, commission breakdown, Stripe Connect payout schedule + statements, refund/chargeback visibility with dispute-evidence upload, downloadable monthly statements (PDF+CSV).
- Analytics: top items, hours heatmap, ratings & review responses, cancellation reasons.
- Multi-location support (one owner → many restaurants), staff roles (Owner/Manager/Staff) with scoped permissions.
- Thermal printer support: ESC/POS via local network printing bridge (web → local print agent) — Phase 5, feature-flagged.
- Onboarding: business info, EIN/W-9, menu setup wizard, Stripe Connect onboarding, go-live checklist.

## 7.6 REFUND / APPEASEMENT MATRIX (server-enforced)

| Case                                       | Resolution                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| Missing item, ≤ $8, trusted customer score | Auto-approve item refund (Stripe partial refund), charge allocation to restaurant |
| Wrong/quality issue with photo evidence    | Auto or 1-touch ops approval; allocation restaurant                               |
| Late > 20 min vs promised                  | Auto credit (config per city) ; allocation platform                               |
| Never arrived (GPS/photo contradicts)      | Ops review mandatory; possible courier action                                     |
| Cancellation before restaurant accept      | Full refund (release auth), no fees                                               |
| Cancellation after prep started            | Refund minus subtotal or per policy; restaurant compensated                       |

Abuse controls: rolling refund-rate score per customer; high scores route everything to manual review.

## 8. FEATURE SPECIFICATION — ADMIN PANEL

- SSO (Google Workspace) + TOTP 2FA; RBAC (superadmin, ops, support, finance, compliance); every mutation → `audit_logs`.
- Live ops map per city (orders, couriers, stuck-order alerts), manual dispatch override/reassign, order editing & cancellation with reason codes.
- User management: customers (refund history, fraud score), couriers (full pipeline status, documents, deactivate/reactivate with appeal workflow), restaurants (commission config within legal caps, activation).
- Config: city creation (draw service polygon on map), fees, surge rules, promos & incentive quests, feature flags.
- Compliance center: FCRA adverse-action queue, CCPA data-request queue (export/delete SLAs with countdown), 1099 season dashboard, consent version manager (forces re-acceptance on TOS change).
- Finance: GMV, take rate, contribution margin per order (§2.3), Stripe reconciliation reports, chargeback pipeline.
- Support console: ticket queues, canned responses (EN/ES), order context sidebar, live chat takeover in any order thread.

---

## 9. TRANSLATED CHAT (EN-US ↔ ES-VE) — FULL SPECIFICATION

**Goal**: customer writes American English, courier reads/writes Venezuelan Spanish. Translation is invisible,
< 800 ms p95, and both original + translation are stored.

### 9.1 Flow

1. Client sends over WS: `chat:send {threadId, text, clientMsgId}` (idempotency by clientMsgId).
2. API detects direction from sender role + each user's `preferred_language`. Same language both sides → skip translation entirely.
3. Translation service (an internal NestJS module, NOT a separate microservice) calls the LLM
   (**Claude Haiku** primary; OpenAI gpt-4o-mini fallback via provider abstraction) with the system prompt in §9.3.
   `max_tokens` capped; streaming off; 2s timeout.
4. On success: persist message (original + translated + latency), emit to room — each recipient receives the text in _their_ language, with a "See original" toggle.
5. On failure/timeout: deliver the ORIGINAL text immediately with an "untranslated" badge + background retry. Chat must never block on the LLM.
6. Cost controls: LRU/Redis cache keyed on normalized text (huge hit-rate: "I'm here", "Ya llegué", "OK"),
   pre-translated **quick-reply chips** (no API call): EN: "I'm outside", "Leave it at the door", "The gate code is …" / ES: "Ya llegué", "Estoy abajo", "No encuentro la entrada". Per-thread rate limit (e.g. 30 msgs/5min). Message length cap 500 chars.
7. Safety: moderation pass (lightweight) flags harassment/PII oversharing to support; system messages (arrival, delivery) are pre-localized strings, never LLM-translated.

### 9.2 Latency & reliability budget

WS in-flight ≤50ms + LLM 300–700ms + fan-out ≤50ms. If p95 > 1.5s for 5 min → alert. Fallback provider auto-switch on 3 consecutive provider errors.

### 9.3 LLM system prompt (corrected & production-ready)

```text
You are a real-time translation engine inside a US food-delivery app.
Translate between American English (customers) and Venezuelan Spanish (delivery drivers).

RULES:
1. Detect the source language of the input and translate to the other one. Output ONLY the translation. No quotes, no explanations, no notes.
2. Register: informal, friendly, and clear — a quick chat between a customer and a driver.
3. For Spanish output, use natural VENEZUELAN Spanish. Never use Peninsular forms ("vosotros", "coche", "piso" for apartment) and avoid neutral/robotic phrasing when a common Venezuelan word exists.
4. Keep numbers, addresses, apartment/unit codes, gate codes, and proper names EXACTLY as written.
5. Preserve the intent of slang; do not translate literally when an idiomatic equivalent exists.
6. If the input is already in the target language, return it unchanged.
7. Never add information, never omit information, never answer questions — you only translate.

VOCABULARY (EN ↔ ES-VE):
- porch → el porche ; front gate → el portón / la reja
- driveway → la entrada de la casa
- lobby / front desk → la recepción / el lobby
- apartment / unit → el apartamento / apto
- gate code / door code → el código de la reja / del portón
- buddy / man → pana / chamo
- okay / got it / sounds good → fino / listo / de una / chévere
- tip → la propina
- order / food → el pedido / la comida
- leave it / drop it off → déjalo / suéltalo ahí
- I'm downstairs → estoy abajo
- I can't find the entrance → no encuentro la entrada

EXAMPLES:
EN in : "Leave it at the porch, the gate is broken."
ES out: "Déjalo en el porche, la reja está dañada."

ES in : "Ya llegué mi pana, estoy abajo en el portón blanco."
EN out: "I'm here man, I'm downstairs by the white gate."

EN in : "The gate code is 4471, apartment 12B, second floor."
ES out: "El código de la reja es 4471, apartamento 12B, segundo piso."

ES in : "Fino, ya subo. ¿Se lo dejo en la puerta?"
EN out: "Got it, coming up now. Should I leave it at the door?"
```

Prompt versioned in repo (`packages/shared/prompts/translation.vX.md`) with an eval set of ≥100 real-style message pairs; CI runs the eval on every prompt change (LLM-as-judge + exact checks on numbers/codes preservation).

---

## 10. PAYMENTS, PAYOUTS & TAX (Stripe-centric)

- **Stripe Connect (Express)** for restaurants AND couriers. Platform charges customer (destination charges NOT used; use separate charges & transfers to split one order across restaurant + courier + platform).
- Order money flow: PaymentIntent auth at checkout → capture at DELIVERED → transfers: restaurant (subtotal − commission), courier earnings ledger (paid weekly or instant payout), platform keeps fees. Tips: 100% to courier — verbatim, displayed as such (FTC has fined platforms over tip misrepresentation; never touch tips).
- **Stripe Tax** for US sales tax at checkout by delivery address + item tax codes. Marketplace facilitator laws: the PLATFORM collects & remits sales tax in essentially all states — registrations handled via Stripe Tax filings or Avalara (business task; code must export liability reports per state).
- **Stripe Identity** for courier KYC; **Radar** rules for card fraud + promo abuse; **Billing** for the Plus subscription (with click-to-cancel).
- **South Carolina specifics (launch state)**:
  - SC's marketplace facilitator law makes the PLATFORM the retailer: it must obtain an SC retail license and remit state AND local sales/use tax on all marketplace sales, regardless of who delivers. 🧑 Register with SC DOR (MyDORWAY) before first order.
  - Prepared food in SC: 6% state sales tax + Beaufort County local option taxes (pull exact combined rate from SC DOR form ST-575 / Stripe Tax at launch; treat as config, verify annually).
  - **Town of Bluffton Hospitality Tax: 2% on gross sales of prepared meals & beverages, remitted DIRECTLY to the Town (monthly/quarterly, due by the 20th, 5%/month late penalty).** Hilton Head Island has its own 2% hospitality tax. These local hospitality taxes are typically OUTSIDE Stripe Tax's automated filing → the tax module must support "custom local tax lines" per city (rate + jurisdiction + remittance report export), and finance ops 🧑 must file with each town. Contract question to resolve with counsel: whether the restaurant or the platform remits the hospitality tax under the marketplace arrangement — the order pricing engine must support both allocations via config.
- **1099 forms**: Stripe Connect 1099 dashboard — 1099-NEC for couriers (≥$600), 1099-K thresholds per current IRS rules (verify each tax year — they have changed repeatedly; treat as config).
- Webhooks: idempotent processing via `webhook_events` (unique event_id), signed-signature verification, replay-safe.
- PCI: SAQ-A scope only — card data never touches our servers (Stripe elements/SDKs everywhere).

## 11. LEGAL & REGULATORY COMPLIANCE (US) — what must exist in code

### 11.1 Courier classification & pay

- Couriers = independent contractors (1.0 stance), BUT the pay engine must support per-city minimum-pay rules as pluggable strategies: **NYC minimum pay rule**, **Seattle PayUp**, **CA Prop 22** (earnings floor ≥120% min wage on engaged time + per-mile, quarterly healthcare stipend by avg weekly engaged hours). `courier_location_pings` + `order_events` are the data source; top-ups auto-created in `courier_earnings`. South Carolina has no gig minimum-pay law or commission caps today, so all strategies ship disabled for SC — but the engine ships with the abstraction + tests, activated per city.
- Transparency: pay breakdown per offer & per receipt (some jurisdictions mandate it; do it everywhere).
- Deactivation: reason codes + human appeal flow (required in NYC/Seattle-style rules; good practice everywhere).

### 11.2 Background checks — FCRA (federal, applies everywhere)

Standalone disclosure → written authorization → Checkr → if negative: pre-adverse action notice + copy of report + "Summary of Rights" + ≥5 business-day dispute window → final adverse action. Fully automated in the compliance module with audit trail.

### 11.3 Privacy — CCPA/CPRA + copycat state laws (VA, CO, CT, UT, TX, FL…)

> South Carolina has no comprehensive consumer-privacy statute today, but the platform ships CCPA-grade tooling anyway: (a) state privacy laws keep multiplying, (b) expansion to other states must not require re-architecture, (c) it is the right standard. Verify the SC legislative status each January (§17.5).

- Privacy policy + "Do Not Sell/Share" handling; a **privacy request center**: data export (machine-readable) and deletion (anonymization job) with statutory SLAs tracked in admin; cookie consent on web (CMP); data-retention schedule enforced by cron jobs (location pings 30d, chat 18mo, tax docs 7y, etc.).
- Sensitive data inventory: SSN/TIN (tokenized, encrypted, access-logged), precise geolocation (disclosed, purpose-limited), government IDs (Stripe-hosted, we store references only).

### 11.4 Accessibility — ADA / WCAG 2.1 AA

Web: semantic HTML, focus management, contrast ≥4.5:1, screen-reader tested (NVDA/VoiceOver), automated axe-core in CI + manual audit before launch. Mobile: accessibility labels/roles on every interactive element, Dynamic Type support, TalkBack/VoiceOver passes on the 5 critical flows. This is a launch gate, not a nice-to-have — delivery apps are a top ADA-lawsuit target.

### 11.5 Communications — TCPA

SMS only with express consent (checkbox, logged in `consents`), STOP/HELP handling, transactional vs marketing separation, quiet hours for marketing.

### 11.6 Other

- FTC fee transparency (total price up-front) — already in checkout spec.
- Food safety: platform disclaimer + restaurant attestation of local permits at onboarding (store the attestation).
- Insurance: occupational-accident policy for couriers + contingent liability — procurement task; app surfaces coverage info to couriers.
- Terms of Service with arbitration clause + versioned acceptance (re-prompt on change).

## 12. APP STORE & PLAY STORE COMPLIANCE (launch gates)

**Apple**: Sign in with Apple offered alongside Google login; in-app account deletion; background location justification text + demo video for review (courier app); privacy nutrition labels accurate; physical-goods payments via Stripe are correct (NOT IAP — food delivery is exempt from IAP); courier app must not appear "demo-empty" to reviewers → provide review test account with a sandbox city seeded with fake orders.
**Google Play**: Data Safety form; `ACCESS_BACKGROUND_LOCATION` declaration + prominent disclosure dialog before the runtime permission; foreground service type `location` for active deliveries; target latest API level.
**Both**: crash-free rate monitoring, staged rollouts (10%→50%→100%), EAS Update only for JS fixes within policy.

## 13. SECURITY (baseline, non-negotiable)

JWT access (15 min) + rotating refresh tokens, revocation list in Redis; WS auth on handshake + per-room authorization (courier can only join own order rooms, etc.); rate limiting per IP+user (Redis); zod validation on every input; Prisma/parameterized SQL only; secrets manager; S3 private + signed URLs; PII field-level encryption (TIN, DL number); dependency scanning (Dependabot) + SAST in CI; admin 2FA; structured logs with PII scrubbing; incident-response runbook; pre-launch third-party pentest (budget item).

## 14. TESTING & QUALITY STRATEGY

- Unit: pricing engine, tax mapping, dispatch scoring, state machine (every legal/illegal transition), min-pay calculators, refund matrix — ≥90% coverage on these modules.
- Integration: Testcontainers (Postgres+PostGIS, Redis) — order lifecycle end-to-end, Stripe webhooks (stripe-cli fixtures), Checkr webhook fixtures.
- E2E: Playwright (web, restaurant, admin), Maestro (both mobile apps) on the 6 golden flows: signup→order→delivery; courier onboarding; restaurant accepts→ready; chat translation; refund; payout.
- Load: k6 — 500 concurrent orders/city, 2,000 couriers pinging, WS fan-out; soak test 24h.
- Translation eval suite (§9.3). Chaos drills: Redis down (degrade to polling), LLM down (untranslated fallback), Stripe webhook replay.
- Beta: TestFlight + Play internal testing with a scripted "friends & family" city before public launch.

## 15. ANALYTICS & KPIs (built into admin from day 1)

Event pipeline (PostHog self-host or Amplitude): activation funnel, order conversion, D7/D30 retention, avg delivery time, on-time %, courier acceptance & completion rates, chat translation usage & latency, refund rate, contribution margin/order, NPS prompt post-delivery.

---

## 16. EXECUTION PLAN FOR CLAUDE CODE (phased; each phase = shippable, tested, reviewed)

> **How to use**: open this repo with Claude Code and work phase by phase. For each phase: (1) read this plan.md,
> (2) propose a task breakdown, (3) implement with tests, (4) update /docs and CHANGELOG. Never start phase N+1
> with failing tests in phase N. Human-only tasks are marked 🧑 (accounts, legal, store consoles).

**Phase 0 — Foundations (repo & infra)**
Monorepo scaffolding (pnpm+Turborepo), shared packages, NestJS skeleton + Prisma + PostGIS migration baseline,
docker-compose local env, CI pipeline (lint/type/test), Sentry wiring, seed scripts (demo city = Bluffton SC, service polygon covering Bluffton + Okatie, 30 fake restaurants, menus, fake couriers). 🧑 open Stripe/Twilio/Checkr/Apple/Google accounts.

**Phase 1 — Identity & catalog**
Auth module (OTP, email, Apple, Google, JWT/refresh), users/roles, addresses w/ geocoding, restaurant + menu CRUD APIs, restaurant-web menu manager v1, customer app: auth, home feed, search, restaurant page (read-only). Spike: Mapbox vs Google decision doc.

**Phase 2 — Ordering & payments**
Server cart, pricing engine (fees/promos/tips/Stripe Tax), checkout with PaymentSheet/Apple Pay/Google Pay, order state machine + events, restaurant live order board with audio alerts, refund matrix v1, receipts/emails. E2E golden flow #1 green.

**Phase 3 — Dispatch, tracking & courier app**
Courier app shell + Go Online + background location, Redis GEO pipeline, dispatch engine + offer screen, pickup/dropoff flows with proof photo, live customer map + ETA, masked calling. Load test tracking path.

**Phase 4 — Translated chat + notifications**
Chat threads/WS rooms, translation module with prompt v1 + eval suite + cache + quick replies + fallbacks, push notification matrix (every state × role), SMS transactional. E2E golden flow #4 green.

**Phase 5 — Money out & compliance**
Stripe Connect onboarding (restaurants + couriers), earnings ledger, weekly + instant payouts, W-9 + Stripe 1099 flows, Checkr FCRA pipeline + adverse-action automation, privacy request center + retention crons, consents versioning, min-pay strategy engine (NYC/Prop22/Seattle implemented + tested, disabled for SC), restaurant finance statements, printer bridge (flagged).

**Phase 6 — Admin, hardening & launch**
Full admin panel (§8), feature flags, surge config, incentives/quests, analytics dashboards, WCAG audit + fixes (web AA, mobile screen-reader pass), pentest remediation 🧑, k6 load + chaos drills, store assets/screenshots/privacy labels 🧑, review accounts + seeded sandbox city, TestFlight/Play internal beta → staged rollout → **Bluffton, SC launch** 🧑 (courier recruiting, restaurant sales along the US-278 corridor, insurance bound, SC tax registrations — see §10 SC tax note).

**Definition of Done (v1.0)**: all 6 golden E2E flows green in CI; crash-free ≥ 99.5% in beta; p95 API < 300ms;
translation p95 < 800ms; WCAG AA audit passed; FCRA + privacy + fee-transparency checklists signed off;
both store reviews passed; runbooks written.

---

## 17. RISKS & OPEN DECISIONS (track in /docs/decisions)

1. Maps provider (cost at scale) — Phase 1 spike.
2. Courier supply cold-start in Bluffton — small-market risk is real (thin courier pool, suburban distances): guaranteed hourly promos at launch, recruit among Hilton Head hospitality workers off-shift (engine supports incentives + scheduled shifts).
   2b. Small-market demand density — Bluffton alone may not sustain unit economics; Hilton Head Island activation should follow within 1–2 months (tourism demand). Model both in the finance dashboard from day 1.
3. LLM translation cost at scale — mitigations in §9.1(6); renegotiate provider at volume.
4. Legal review 🧑 — TOS, privacy policy, contractor agreements, insurance: US counsel before launch (non-negotiable).
5. 1099-K thresholds & state privacy laws change yearly — compliance config reviewed every January.
6. If expansion to CA/NY: activate min-pay strategies + commission caps BEFORE going live there (launch checklist per city in admin).

_End of plan.md — version 1.1 (launch market updated: Bluffton, SC)_
