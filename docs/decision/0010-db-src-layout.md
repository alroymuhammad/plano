# 0010 — `src/` layout for `packages/db`

Status: accepted
Date: 2026-11-20

## Context

0007 put `schema.ts` and the client in the package root and migrations in `migrations/`. We want the db package laid out like `agents`, with drizzle-kit's default output folder.

## Decision

- Schema: `packages/db/src/schema.ts`, the single source of truth for every table.
- Client: `packages/db/src/client.ts` exports `createDb(url)` and `Db`.
- Public entry: `packages/db/src/index.ts` re-exports `createDb`, `Db`, and `schema`.
- Migrations: SQL in `packages/db/drizzle/`, generated from the schema.

Everything else in 0007 stands. Supersedes the file layout of 0007.

## Consequences

Imports stay `@plano/db`. Moving the migrations folder doesn't re-run applied migrations; drizzle tracks them by hash in the database.
