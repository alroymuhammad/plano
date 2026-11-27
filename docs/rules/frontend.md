# Frontend (`apps/platform`)

React 19 + Vite + TanStack Router (file-based) + Tailwind v4. Module-driven.

## Structure

```
apps/platform/src/
  main.tsx
  index.css
  routes/                  pages and routes (file-based). Pages live here, not in modules.
  modules/{module-name}/
    components/            reusable components only
    hooks/                 reusable hooks only
    types.ts
```

## Rules

- Pages/routes are written in `src/routes/`. Never put a page in a module.
- `components/` and `hooks/` hold only things reused (or clearly about to be reused). Single-use pieces stay in the route file.
- `routeTree.gen.ts` is generated. Don't edit or commit it.
- Style with Tailwind classes. No CSS files beyond `index.css`.
- Call the API through `/api/*` (Vite proxies to the API in dev).
- Auth goes through `authClient` from `src/modules/auth/client.ts` (decision 0006).
- Route protection uses TanStack Router pathless layouts: put protected pages under `src/routes/_authenticated/` and guest-only auth pages under `src/routes/_auth/` (decision 0031).
- Shared UI primitives come from `@plano/ui/components/*` instead of raw HTML form controls.
- Server state lives in hooks inside the module; keep components dumb.
- Cross-module reuse of generic UI goes to `packages/ui`, not module-to-module imports.
