# ADR-001 — Monorepo tooling: pnpm + Turborepo

**Status**: Accepted
**Date**: 2026-07-08

## Context

The platform has 6 apps and 3 shared packages across 3 different runtimes (Node/NestJS, Next.js, React Native/Expo). We need a monorepo tool that handles:
- Shared TypeScript config and ESLint rules without duplication
- Incremental builds and test caching
- Cross-workspace dependency management (workspace:* protocol)

## Decision

**pnpm workspaces** + **Turborepo** (v2).

- pnpm: strict module resolution (no hoisting), disk-efficient symlinks, fastest install times.
- Turborepo: task pipeline with caching (local + remote via GitHub Actions cache), parallel execution, dependency-aware ordering (`^build` topology).

## Rejected alternatives

- **Nx**: more configuration overhead; Turborepo is simpler for our pipeline shape.
- **Yarn workspaces + Lerna**: slower installs; Lerna is largely superseded by Turborepo for task orchestration.
- **npm workspaces**: no caching, slower.

## Consequences

- All inter-package imports use `workspace:*` and are resolved via TypeScript path aliases (no build step needed in dev).
- Adding a new app requires: create `apps/<name>/package.json`, add tsconfig extends, register in `turbo.json` if it has custom tasks.
