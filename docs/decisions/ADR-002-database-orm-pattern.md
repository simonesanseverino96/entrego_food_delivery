# ADR-002 — Database ORM pattern: Prisma + raw PostGIS

**Status**: Accepted
**Date**: 2026-07-08

## Context

The platform requires:
1. A typed ORM for standard CRUD (users, orders, menus, etc.) to avoid hand-written SQL for every table.
2. PostGIS geo operations (`ST_DWithin`, `ST_Distance`, `GEOSEARCH` equivalent, `ST_MakePoint`) that Prisma does not natively support.
3. A partitioned table (`courier_location_pings`) that Prisma's migrate cannot manage.

## Decision

**Prisma** for all standard CRUD + **`$queryRaw` / `$executeRaw`** for every PostGIS operation.

Rules:
- `geometry(Point,4326)` and `geometry(MultiPolygon,4326)` columns are declared in raw SQL migrations; Prisma ignores them (Prisma `Unsupported()` type is not used — too many caveats with generate).
- All geo reads use `$queryRaw` with tagged template literals (safe from injection).
- `$executeRawUnsafe` is only used in seed scripts where parameterized values are not user-supplied.
- GIST indexes are created in the initial migration (`migration.sql`).

## Rejected alternatives

- **TypeORM**: less ergonomic TS type generation; Prisma's auto-generated types are better.
- **Drizzle**: excellent PostGIS support but still maturing; migration tooling less stable.
- **MikroORM**: good PostGIS support but steeper learning curve and larger bundle.

## Consequences

- Geo queries must be tested with real Postgres+PostGIS (Testcontainers in CI — no mocking allowed, see CLAUDE.md rule).
- Any migration touching geo columns requires a raw SQL file alongside the Prisma migration.
- The PostGIS workaround must be documented for every new developer (see `prisma/migrations/README.md`).
