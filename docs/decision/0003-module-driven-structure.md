# 0003 — Module-driven structure in apps

Status: accepted
Date: 2026-11-19

## Context

Both apps need a predictable place for each feature's code.

## Decision

Both apps organise code by feature under `apps/api/src/modules/{module-name}/` and `apps/platform/src/modules/{module-name}/`. Modules are app functionality; code shared across apps goes in `packages/*`. Exact file layout is in `docs/rules/backend.md` and `docs/rules/frontend.md`.

## Consequences

A feature lives in one folder. Cross-module imports are limited (see `docs/rules/architecture.md`).
