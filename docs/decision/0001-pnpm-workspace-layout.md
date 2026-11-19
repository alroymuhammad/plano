# 0001 — pnpm workspace layout

Status: accepted
Date: 2026-11-19

## Context

We need one repo for the API, the web app, and shared code.

## Decision

pnpm workspace with:

- `apps/api` — Hono API
- `apps/platform` — React + Vite + TanStack Router (file-based) + Tailwind
- `packages/{agents,ui,observability,db}` — shared packages, consumed as TypeScript source (no build step)

## Consequences

Apps import packages directly as `@plano/<name>`. No publishing, no package build pipeline. Revisit if a package must be consumed outside this repo.
