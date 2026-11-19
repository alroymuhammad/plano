# 0005 — Postgres for `packages/db`

Status: superseded by 0007
Date: 2026-11-19

## Context

`packages/db` needs a real server database. 0002 listed `@anvia/memory-sqlite` for it.

## Decision

`packages/db` uses PostgreSQL via `postgres` (postgres.js). Local instance: `docker-compose.yml` at the repo root, host port `54329`. The caller passes the URL (`DATABASE_URL`, see `.env.example`) to `createDb(url)`. Replaces the `packages/db` line of 0002.

## Consequences

Devs need Docker (`docker compose up -d`). No ORM or migrations yet; add when needed.
