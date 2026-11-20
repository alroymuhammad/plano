# Packages (`packages/*`)

## Structure

Each package is `package.json` + `index.ts` (add files only as needed). Named `@plano/<name>`.

## Rules

- Consumed as TypeScript source. No build step, no `dist`.
- `index.ts` is the only public entry. Import from `@plano/<name>`, never from deep paths.
- Anvia deps live in the package that owns the concern:
  - `agents` — `@anvia/core`, `@anvia/openai`, `@anvia/anthropic` (decision 0008)
  - `ui` — `@anvia/react`, `@anvia/react-ui`
  - `observability` — `@anvia/otel`, `@anvia/logger`
  - `db` — none; uses `drizzle-orm` + `postgres` (see decision 0007)
- Exception: `ui` is a shadcn package. Code lives in `src/` (managed by the shadcn CLI, excluded from oxfmt/oxlint). Import via deep paths: `@plano/ui/components/<name>`, `@plano/ui/hooks/<name>`, `@plano/ui/lib/utils`, `@plano/ui/globals.css`. Add components with `pnpm dlx shadcn@latest add <name>` from `packages/ui`; don't hand-edit them.
- Exception: `agents` keeps code in `src/` (`core.ts`, `instruction.ts`, `tools/`, `evals/`, `utils/`); `src/index.ts` is its only public entry.
- Packages never import from `apps/*`.
- Add dependencies with `pnpm --filter @plano/<name> add <dep>`.
- Config comes from the caller (env or arguments). Packages don't read app-specific files.

## Database (`packages/db`)

- Every table is defined in `schema.ts`. Never change the database by hand.
- After changing `schema.ts`: `pnpm db:generate`, review the SQL, then `pnpm db:migrate`. Commit the migration with the schema change.
- Never edit a migration that has been applied; generate a new one.
- Column names are the TS keys (camelCase), matching better-auth's defaults.
