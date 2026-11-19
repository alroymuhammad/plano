# 0006 — better-auth for authentication

Status: accepted (database wiring superseded by 0007)
Date: 2026-11-19

## Context

Users need to sign up (name, email, password) and sign in (email, password).

## Decision

Use better-auth with email and password.

- API: the instance lives in `apps/api/src/auth.ts`. Its handler is mounted at `/auth/*`, so the web app reaches it at `/api/auth/*` through the Vite proxy. It uses postgres.js from `@plano/db` via `kysely-postgres-js` (keeps 0005).
- Tables are created by `pnpm --filter api migrate` (better-auth's `getMigrations`), not by hand.
- Web: a single client in `apps/platform/src/modules/auth/client.ts` (`better-auth/react`).
- Env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `PLATFORM_URL` (trusted origin). See `.env.example`.

## Consequences

Auth routes are owned by better-auth, not a module with router/schema/service. Email verification and password reset are not set up.
