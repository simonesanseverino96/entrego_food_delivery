# Changelog

All notable changes to Entrego are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/) (pre-1.0 during development phases).

---

## [Unreleased] — Phase 0

### Added
- Monorepo scaffolding: pnpm workspaces + Turborepo
- `packages/config`: shared tsconfig bases (base, nextjs, nestjs, react-native), ESLint configs, Prettier, Tailwind preset
- `packages/shared`: domain enums (UserRole, OrderStatus full state machine, VehicleType, etc.), Zod schemas, TypeScript types; order state machine test suite (100% coverage on transitions)
- `apps/api`: NestJS skeleton with Zod env validation, health endpoints (`/api/v1/health`, `/api/v1/health/db`), Sentry wiring, Prisma service
- `apps/api/prisma`: full schema (all 30+ models from plan.md §5), PostGIS migration with GIST indexes, seed script (Bluffton SC city, 30 restaurants, 10 couriers, 5 customers)
- `docker-compose.yml`: Postgres 16+PostGIS, Redis 7, LocalStack S3, Stripe CLI (stripe profile)
- `.env.example` with all required env vars documented
- Next.js stubs: `web` (port 3000), `restaurant-web` (port 3002), `admin-web` (port 3003)
- Expo stubs: `customer-mobile`, `courier-mobile` (with background location permissions declared)
- GitHub Actions CI: typecheck → lint → unit tests → integration tests (Testcontainers) → Docker build
- API Dockerfile (multi-stage, non-root user, health check)
- `CLAUDE.md` with commands, conventions, and work rules
- ADR-001 (monorepo tooling), ADR-002 (DB/ORM pattern)
