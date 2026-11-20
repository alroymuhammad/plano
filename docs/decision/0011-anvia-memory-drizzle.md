# 0011 — Agent memory with `@anvia/memory-drizzle`

Status: accepted
Date: 2026-11-20

## Context

0002 planned `@anvia/memory-sqlite` for agent memory, but the app database is Postgres via Drizzle (0007, 0010). Agents need durable conversation history.

## Decision

- `packages/db` depends on `@anvia/memory-drizzle` and re-exports its tables (`agentMemorySessions`, `agentMemoryMessages`, `agentMemoryErrors`, `agentMemoryWrites`) from `src/schema.ts`, so they go through our normal migrations.
- `createMemoryStore(db)` in `src/anvia-memory.ts` returns a `DrizzleMemoryStore`; exported from `@plano/db`.
- `runAgent` takes an optional `memory` store and `session` scope (`savePolicy: 'turn'`). The caller (an app) wires db to agents, so the packages don't import each other.
- The package exports ESM only, so `pnpm db:generate` runs drizzle-kit with `NODE_OPTIONS=--conditions=import`.

Supersedes the `packages/db` line of 0002.

## Consequences

Memory tables use the package's snake_case column names, an exception to the camelCase rule. Upgrading `@anvia/memory-drizzle` can change its tables; run `pnpm db:generate` after upgrades and review the SQL.
