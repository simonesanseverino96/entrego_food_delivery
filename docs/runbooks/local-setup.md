# Runbook: Local Development Setup

## Prerequisites

- Node.js 20+ (`nvm use 20`)
- pnpm 9+ (`npm i -g pnpm@9`)
- Docker Desktop running
- Copy `.env.example` → `.env` and fill in real values (or leave placeholder for offline dev)

## First-time setup

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Start local services
docker-compose up -d

# 3. Wait for Postgres to be healthy (check: docker ps)
# 4. Create S3 buckets in LocalStack
bash scripts/s3-init.sh

# 5. Apply database migrations + seed
pnpm db:migrate
pnpm db:seed

# 6. Start the API
pnpm --filter @entrego/api dev
# → http://localhost:3001/api/v1/health

# 7. (Optional) Start web apps
pnpm --filter @entrego/web dev           # → http://localhost:3000
pnpm --filter @entrego/restaurant-web dev # → http://localhost:3002
pnpm --filter @entrego/admin-web dev      # → http://localhost:3003
```

## Running tests

```bash
pnpm test:unit          # fast, no Docker needed
pnpm test:integration   # slow (~60s), starts Testcontainers automatically
```

## Resetting the database

```bash
pnpm db:reset   # drops + recreates + re-seeds (dev only — destructive)
```

## Stripe webhook forwarding

Start the Stripe CLI profile in docker-compose:

```bash
docker-compose --profile stripe up -d stripe-cli
```

Or run manually (requires `stripe` CLI installed):

```bash
stripe listen --forward-to http://localhost:3001/api/v1/webhooks/stripe
```
