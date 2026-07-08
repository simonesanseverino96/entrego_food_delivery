import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    poolOptions: {
      forks: {
        singleFork: true, // integration tests share one process to avoid port conflicts
      },
    },
  },
});
