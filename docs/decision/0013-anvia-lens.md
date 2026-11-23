# 0013 — Anvia Lens for agent tracing

Status: accepted
Date: 2026-11-23

## Context

We need traces of agent runs (model calls, tools, errors, usage) and a place to keep eval results next to them.

## Decision

Use self-hosted [Anvia Lens](https://anvia.dev/lens):

- Server: upstream `docker-compose.yml` (v0.20.1) vendored in `lens/`, project `plano-lens`, `rslave` bind propagation removed (WSL Docker rejects it), served on `http://localhost:8082`. Secrets live in `lens/.env` (from `lens/.env.example`). Run with `pnpm lens:up`.
- Client: `@anvia/lens` in `packages/observability`. `createLens()` returns the `LensClient` and an `observability` option; callers pass it to `runAgent`. The client is `optional`, so missing `ANVIA_LENS_*` env makes it a no-op.
- Capture mode stays `safe` (no prompt/response bodies) unless a caller opts in.

## Consequences

Tracing is opt-in per `runAgent` call. `@anvia/lens` needs `@anvia/core` ^1.21 and Node 24+. Lens adds Postgres, ClickHouse and Redis containers locally; upgrade by re-vendoring the compose file at a new tag.
