# 0004 — oxlint and oxfmt

Status: accepted
Date: 2026-11-19

## Context

We want fast, low-config linting and formatting.

## Decision

Root-level `oxlint` (`.oxlintrc.json`) and `oxfmt` (`.oxfmtrc.json`). Run via `pnpm lint` and `pnpm format`. No semicolons, single quotes.

## Consequences

One config for the whole repo. No ESLint/Prettier.
