# 0024 — Node's test runner through tsx for agents

Status: accepted
Date: 2026-11-25

## Context

The repo had no test runner. The RAG slice needs tests that run against the local Postgres and the RTRW fixture, and that cost nothing to run. `packages/agents` already runs TypeScript through `tsx` (Studio, evals).

## Decision

- Tests are `*.test.ts` files next to their code under `packages/agents/src`. `pnpm --filter @plano/agents test` runs them with `tsx --test` on Node's built-in `node:test`.
- Tests make no paid calls. Embeddings come from a fake model passed in (decision 0022), and chat models are not called.
- A test that needs a gitignored fixture skips with a message when the fixture is absent, so a fresh checkout does not fail.

## Consequences

Assertions use `node:assert`; there is no expect-style matcher library. Add one only when a test needs what `node:assert` lacks.
