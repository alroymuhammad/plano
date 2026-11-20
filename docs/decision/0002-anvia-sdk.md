# 0002 — Anvia SDK for agent development

Status: superseded by 0011 (db memory package)
Date: 2026-11-19

## Context

We build AI agents and want one typed runtime that can swap model providers.

## Decision

Use the Anvia SDK (anvia.dev):

- `packages/agents` — `@anvia/core`, `@anvia/openai`
- `packages/ui` — `@anvia/react`, `@anvia/react-ui`
- `packages/observability` — `@anvia/otel`, `@anvia/logger`
- `packages/db` — `@anvia/memory-sqlite`

## Consequences

Anvia packages are versioned independently; check compatibility when upgrading. Switching provider means swapping the adapter package, not rewriting agents.
