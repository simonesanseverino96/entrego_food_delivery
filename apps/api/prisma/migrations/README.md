# Prisma Migrations — PostGIS Pattern

## Why we use raw SQL for geometry columns

Prisma does not natively support PostGIS geometry types. The workaround:

1. Geometry columns are omitted from `schema.prisma` (Prisma ignores them).
2. They are added via raw SQL in the migration file (`migration.sql`).
3. All geo reads/writes use `prisma.$queryRaw` or `prisma.$executeRaw` with parameterized queries.
4. GIST indexes are created in the same migration.

## Running migrations

```bash
# Apply pending migrations (production-safe)
pnpm db:migrate

# Create a new migration during development
pnpm --filter @entrego/api db:migrate:dev -- --name <description>
```

## Partitioned table: courier_location_pings

`courier_location_pings` is partitioned by `recorded_at` (daily).
A BullMQ cron job creates the next 7 days of partitions weekly and drops
partitions older than 30 days (retention policy per §11.3 of plan.md).
Partitions are NOT created in the initial migration — the cron job handles it.
