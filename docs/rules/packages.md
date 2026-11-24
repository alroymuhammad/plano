# Packages (`packages/*`)

## Structure

Each package is `package.json` + `index.ts` (add files only as needed). Named `@plano/<name>`.

## Rules

- Consumed as TypeScript source. No build step, no `dist`.
- `index.ts` is the only public entry. Import from `@plano/<name>`, never from deep paths.
- Shared types (exported, or used by more than one file) live in the package's `types.ts`, next to `index.ts`. `index.ts` re-exports the public ones.
- Anvia deps live in the package that owns the concern:
  - `agents` — `@anvia/core`, `@anvia/openai` (decision 0018), `@tavily/core` (decision 0009), `@anvia/studio` (dev only)
  - `ui` — `@anvia/react`, `@anvia/react-ui`
  - `observability` — `@anvia/otel`, `@anvia/logger`, `@anvia/lens` (decision 0013)
  - `db` — `@anvia/memory-drizzle` for agent memory (decision 0011); otherwise `drizzle-orm` + `postgres` (decision 0007)
- Exception: `ui` is a shadcn package. Code lives in `src/` (managed by the shadcn CLI, excluded from oxfmt/oxlint). Import via deep paths: `@plano/ui/components/<name>`, `@plano/ui/hooks/<name>`, `@plano/ui/lib/utils`, `@plano/ui/globals.css`. Add components with `pnpm dlx shadcn@latest add <name>` from `packages/ui`; don't hand-edit them.
- Exception: `db` keeps code in `src/` (`client.ts`, `schema.ts`, `anvia-memory.ts`, `types.ts`); `src/index.ts` is its only public entry. Migrations go in `drizzle/` (decision 0010).
- Exception: `agents` keeps code in `src/` (`core.ts`, `instruction.ts`, `types.ts`, `tools/`, `find-documents/`, `utils/`, `evals/`); `src/index.ts` is its only public entry. The dev-only entries `src/studio.ts` and `src/evals/find-documents/{record,eval}.ts` run from package scripts and are not exported.
- Agent tracing: create one `createLens()` per process from `@plano/observability` and pass its `observability` to `runAgent`, and its `pipelineObservability` to pipelines (`findDocuments(prompt, { observability: pipelineObservability })`). Library code under `agents/src` never imports `observability`. `@plano/observability` is a devDependency of `agents`, used only by the dev entry `agents/src/studio.ts`. Only `studio.ts` imports `@anvia/studio`.
- Each agent tool lives in `agents/src/tools/<name>/`: `index.ts` defines the tool (name, description, input schema) and calls `service.ts`, which holds the logic and external clients. Register it in `tools/tools.ts`.
- Packages never import from `apps/*`.
- Add dependencies with `pnpm --filter @plano/<name> add <dep>`.
- Config comes from the caller (env or arguments). Packages don't read app-specific files.

## Database (`packages/db`)

- Every table is defined in `src/schema.ts`. Never change the database by hand.
- After changing `src/schema.ts`: `pnpm db:generate`, review the SQL, then `pnpm db:migrate`. Commit the migration with the schema change.
- Never edit a migration that has been applied; generate a new one.
- Column names are the TS keys (camelCase), matching better-auth's defaults. Exception: the `agent_memory_*` tables re-exported from `@anvia/memory-drizzle` keep its snake_case columns (decision 0011).
