# 0007 — Drizzle on Postgres for `packages/db`

Status: accepted
Date: 2026-11-19

## Context

0005 used raw postgres.js with no schema or migrations. We now have tables (auth) and need a typed schema and versioned migrations. 0006 wired better-auth through Kysely and its own migrator.

## Decision

`packages/db` uses Drizzle (`drizzle-orm`, postgres.js driver) with `drizzle-kit` for migrations.

- Schema: `packages/db/schema.ts`, the single source of truth for every table.
- Migrations: SQL in `packages/db/migrations/`, generated from the schema.
- `createDb(url)` returns a Drizzle client; `schema` is exported alongside it.
- better-auth uses `drizzleAdapter` with this schema. Its Kysely dialect and `getMigrations` script are removed.
- Postgres stays in `docker-compose.yml` on host port `54329`.

Supersedes 0005, and the database wiring of 0006.

## Consequences

Schema changes go through `pnpm db:generate` and `pnpm db:migrate`. better-auth config changes that add fields must be mirrored in `schema.ts`.
