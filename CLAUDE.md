# CLAUDE.md — Entrego Food Delivery Platform

## Commands

```bash
# Install all workspaces
pnpm install

# Start all apps in parallel (dev mode)
pnpm dev

# Start a single app
pnpm --filter @entrego/api dev
pnpm --filter @entrego/web dev
pnpm --filter @entrego/restaurant-web dev
pnpm --filter @entrego/admin-web dev
pnpm --filter @entrego/customer-mobile dev
pnpm --filter @entrego/courier-mobile dev

# Build all
pnpm build

# Type check all workspaces
pnpm typecheck

# Lint all workspaces
pnpm lint

# Tests
pnpm test               # unit + integration (all workspaces)
pnpm test:unit          # unit only
pnpm test:integration   # requires docker (Testcontainers)
pnpm test:e2e           # Playwright (web/restaurant/admin) + Maestro (mobile)

# Database (run from repo root)
pnpm db:migrate         # apply pending Prisma migrations
pnpm db:seed            # seed Bluffton SC demo data
pnpm db:reset           # drop + recreate + seed (dev only — destructive)
pnpm db:studio          # open Prisma Studio UI

# Local environment (Postgres+PostGIS, Redis, LocalStack S3, Stripe CLI)
docker-compose up -d
docker-compose down
```

## Code conventions

- **TypeScript strict mode everywhere** — `"strict": true` in every tsconfig.
- **All money in integer cents** — never floats for currency. `2999` = $29.99.
- **All timestamps** — `timestamptz` in DB; ISO 8601 strings in REST; `Date` in TS.
- **Zod schemas** in `packages/shared` are the single source of truth for validation; always import from there, never redefine locally.
- **No hardcoded business rules** — commission %, taxes, delivery fees, surge multipliers, courier pay rules, and service fees are per-jurisdiction config read from DB (`cities`, `feature_flags`). Never constants in code.
- **Prisma** for CRUD; `$queryRaw` / `$executeRaw` only for PostGIS geo queries (Prisma doesn't cover all PostGIS operators).
- **NestJS** — one module per domain; no cross-module direct model imports; communicate through exported services or events.
- **REST** — `/api/v1/<resource>`; OpenAPI spec auto-generated from NestJS decorators.
- **WebSocket events** — snake_case namespaced: `chat:send`, `location:update`, `order:status_changed`.
- **Soft deletes** only where legally required (user data, CCPA); otherwise hard delete.
- **PII never in logs** — Sentry `beforeSend` scrubber + structured log filter on all apps.
- **Secrets in env vars only** (AWS Secrets Manager / Doppler in prod) — never commit `.env` files.
- **No comments** unless the WHY is non-obvious (hidden constraint, subtle invariant, regulatory workaround).

## Work rules (enforced every session)

1. **One phase at a time.** Do not begin Phase N+1 if any test in Phase N is failing.
2. **Tests with every feature.** Every new module ships with:
   - Unit tests (≥90% coverage on: pricing engine, dispatch scorer, order state machine, min-pay calculators, refund matrix).
   - Integration tests (Testcontainers Postgres+PostGIS + Redis) for anything touching DB or cache.
3. **🧑 tasks are human-only.** Never simulate, stub, or auto-complete: Stripe/Checkr/Twilio account setup, tax registrations, legal filings, App Store/Play Store submissions. List them explicitly as actions for the human.
4. **No hardcoded fees or rules** — see conventions above.
5. **Stop and request confirmation** at the end of each phase before proceeding.
6. **Audit trail always:**
   - Order state transitions → `order_events`
   - Admin mutations → `audit_logs`
   - Dispatch decisions → `dispatch_events`
7. **FCRA adverse-action flow is exact.** Standalone disclosure → written consent → Checkr invite → webhook result → if negative: pre-adverse notice + report copy + Summary of Rights + ≥5 business-day dispute window → final adverse action. No shortcuts.
8. **Fee transparency.** All mandatory fees shown pre-checkout (FTC total-price rule). Tips are 100% to courier — never deducted, never delayed.
9. **State machine enforced server-side.** Illegal order transitions must throw; every transition is persisted in `order_events` with actor + timestamp.
10. **Jurisdiction config, not code.** Before adding any rate, cap, or rule as a constant, ask: "Is this number jurisdiction-specific?" If yes, it goes in DB config.
