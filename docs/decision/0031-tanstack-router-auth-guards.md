# 0031 — TanStack Router pathless layouts for auth guards

Status: accepted
Date: 2026-11-27

## Context

`apps/platform` needs route protection so unauthenticated users cannot reach workspace routes and signed-in users are redirected away from `/signin` and `/signup`. Previously, `__root.tsx` hid navigation by checking `pathname`, and no route enforced authentication before rendering.

## Decision

Use TanStack Router file-based pathless layout routes with typed router context (`createRootRouteWithContext`) and `beforeLoad` guards backed by `authClient.getSession()` (decision 0006):

- `src/routes/__root.tsx` defines `RouterContext` (`auth.getSession`) and renders only `<Outlet />`.
- `src/routes/_authenticated/route.tsx` wraps all protected workspace routes (such as `_authenticated/index.tsx` for `/`). Its `beforeLoad` resolves the session and throws `redirect({ to: '/signin', search: { redirect: location.href } })` when unauthenticated; otherwise it passes `{ session }` into route context and renders the app chrome.
- `src/routes/_auth/route.tsx` wraps guest-only auth routes (`_auth/signin.tsx` for `/signin`, `_auth/signup.tsx` for `/signup`). Its `beforeLoad` throws `redirect({ to: '/' })` when a session already exists.
- `/signin` validates the optional `redirect` search param to allow only safe same-origin relative paths (starting with `/` and not `//`).

## Consequences

- Route protection and layout separation live in the route tree rather than pathname checks or component-level effects, avoiding flash-of-unauthenticated-content on reload.
- Adding a new protected page only requires placing the file under `src/routes/_authenticated/`.
- Every guarded navigation checks the session via `authClient.getSession()`; if extra latency becomes noticeable later, add short-lived client caching around `getAuthSession`.
