# Architecture

## Layout

```
apps/api            Hono API
apps/platform       React web app
packages/agents     Anvia agents
packages/ui         shared UI
packages/observability  logging / tracing
packages/db         persistence
```

## Rules

- Apps may import from `packages/*`. Packages never import from `apps/*`.
- Packages don't import each other unless unavoidable; if so, one direction only, no cycles.
- `apps/platform` talks to `apps/api` over HTTP only. Never import API code into the web app, except `type` imports (e.g. `AppType`).
- Modules live inside each app (`apps/api/src/modules/*`, `apps/platform/src/modules/*`); they are app functionality, not shared code. Modules don't import from other modules' internals. Share via a package, or call the other module's `service.ts`.
- Keep it simple. No abstraction until the second real use.
- Record non-obvious choices in `docs/decision/`.
