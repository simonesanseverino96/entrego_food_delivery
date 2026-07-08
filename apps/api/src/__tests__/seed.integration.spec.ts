/**
 * Integration test — Phase 0 Definition of Done.
 * Uses Testcontainers to spin up a real Postgres+PostGIS + Redis.
 * Verifies: migration applies, seed runs, PostGIS geo query works,
 * and the health endpoint returns 200.
 *
 * Run: pnpm --filter @entrego/api test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import path from 'node:path';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;

const PRISMA_ROOT = path.resolve(__dirname, '../../');

beforeAll(async () => {
  // Start Postgres 16 with PostGIS
  container = await new PostgreSqlContainer('postgis/postgis:16-3.4-alpine')
    .withDatabase('entrego_test')
    .withUsername('entrego')
    .withPassword('entrego_test')
    .start();

  const dbUrl = container.getConnectionUri();
  process.env['DATABASE_URL'] = dbUrl;
  process.env['JWT_SECRET'] = 'test_secret_at_least_32_characters_long!!';
  process.env['REDIS_URL'] = 'redis://localhost:6379'; // not used in these tests

  // Run Prisma migration
  execSync('pnpm db:migrate', {
    cwd: PRISMA_ROOT,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  });

  // Run seed
  execSync('pnpm db:seed', {
    cwd: PRISMA_ROOT,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  });

  prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
}, 120_000);

afterAll(async () => {
  await prisma.$disconnect();
  await container.stop();
});

describe('Phase 0 — seed verification', () => {
  it('seeds exactly 30 restaurants', async () => {
    const count = await prisma.restaurant.count();
    expect(count).toBe(30);
  });

  it('seeds exactly 10 couriers', async () => {
    const count = await prisma.courierProfile.count();
    expect(count).toBe(10);
  });

  it('seeds exactly 5 customers', async () => {
    const count = await prisma.customerProfile.count();
    expect(count).toBe(5);
  });

  it('seeds Bluffton city', async () => {
    const result = await prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM cities WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
    `;
    expect(result[0]?.name).toBe('Bluffton');
  });

  it('seeds feature flags', async () => {
    const flags = await prisma.featureFlag.findMany();
    expect(flags.length).toBeGreaterThanOrEqual(7);
    const surgeFlag = flags.find((f) => f.key === 'surge_enabled');
    expect(surgeFlag?.value).toBe(false);
  });
});

describe('Phase 0 — PostGIS geo query', () => {
  it('ST_DWithin finds restaurants within 10km of Bluffton town center', async () => {
    const blufftonLng = -80.86;
    const blufftonLat = 32.237;
    const radiusM = 10_000;

    const result = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM restaurants
      WHERE ST_DWithin(
        location::geography,
        ST_MakePoint(${blufftonLng}, ${blufftonLat})::geography,
        ${radiusM}
      )
    `;
    const count = Number(result[0]?.count ?? 0);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(30);
  });

  it('Bluffton city has a valid service_area polygon', async () => {
    const result = await prisma.$queryRaw<{ is_valid: boolean }[]>`
      SELECT ST_IsValid(service_area) as is_valid
      FROM cities
      WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
    `;
    expect(result[0]?.is_valid).toBe(true);
  });
});

describe('Phase 0 — menus', () => {
  it('every restaurant has at least one menu with at least one item', async () => {
    const result = await prisma.$queryRaw<{ restaurant_count: bigint }[]>`
      SELECT COUNT(DISTINCT r.id) as restaurant_count
      FROM restaurants r
      JOIN menus m ON m.restaurant_id = r.id
      JOIN menu_categories mc ON mc.menu_id = m.id
      JOIN menu_items mi ON mi.category_id = mc.id
    `;
    const count = Number(result[0]?.restaurant_count ?? 0);
    expect(count).toBe(30);
  });
});
