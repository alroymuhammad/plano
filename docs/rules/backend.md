# Backend (`apps/api`)

Hono + zod + `@hono/zod-validator`. Module-driven.

## Structure

```
apps/api/src/
  index.ts                 app setup, mounts module routers, starts server
  modules/{module-name}/
    router.ts              Hono routes: parse input, call service, return response
    schema.ts              zod schemas and inferred types
    service.ts             business logic
```

## Rules

- `router.ts` is thin: validate with `zValidator`, call the service, return. No business logic.
- `service.ts` has no Hono imports (no `c`, no `Context`). Plain functions in, plain data out.
- `schema.ts` is the single source of input/output shapes. Infer types with `z.infer`.
- Every request body, query and param goes through `zValidator`.
- Each router is mounted in `src/index.ts` with `app.route('/{module-name}', router)`.
- Throw `HTTPException` for expected errors.
- Every module has all three files. Don't add more until a file gets unwieldy.
- Export `AppType` from `src/index.ts` for the web app's typed client.
- Auth is the exception to modules: better-auth in `src/auth.ts`, mounted at `/auth/*` (decision 0006). Its tables live in `packages/db/src/schema.ts` (decisions 0007, 0010).
