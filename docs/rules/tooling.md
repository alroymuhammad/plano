# Tooling

- Package manager: pnpm only. Add deps with `pnpm --filter <name> add`, root tooling with `pnpm add -Dw`.
- `pnpm lint` — oxlint. Must pass. Custom rules live in the local plugin `tooling/oxlint/plano.mjs` (decision 0012).
- `pnpm format` — `oxlint --fix`, then oxfmt (writes files). Run before committing.
- `pnpm build` — builds/typechecks all apps. Must pass.
- Dev: `docker compose up -d`, `pnpm db:migrate`, then `pnpm dev:api`, `pnpm dev:platform`.
- Studio: `pnpm dev:studio` serves Anvia Studio on port 4021 (`http://localhost:4021/playground`) with the Find Documents pipeline (decisions 0017, 0019). Input: `{ "findDocumentPrompt": "..." }`. Needs `TAVILY_API_KEY` and the gateway vars in `.env`.
- Evals (decision 0019): `pnpm --filter @plano/agents eval:record [caseId ...]` records live runs (spends Tavily credits; skips recorded cases unless `--force`); `pnpm --filter @plano/agents eval [caseId ...] [--no-judge]` scores the recordings.
- Lens (optional tracing, decision 0013): copy `lens/.env.example` to `lens/.env` with fresh secrets, `pnpm lens:up`, open `http://localhost:8082`, create a project key, set `ANVIA_LENS_*` in `.env`. Lens is a no-op while `ANVIA_LENS_*` is unset. Once it is set, Lens throws without a service name, so `createLens()` defaults it to `plano` (override with `ANVIA_LENS_SERVICE_NAME`). `lens/docker-compose.yml` is vendored upstream; only local edits are the project name and no `rslave` bind propagation (fails on WSL Docker).
- DB: `pnpm db:generate` (migration from schema), `pnpm db:migrate` (apply).
- Style: no semicolons, single quotes, a blank line before and after every `if` (decision 0012), no nested ternaries, no conditional spread (`...(x && {...})`, `...(x ? a : b)`); use an `if` instead. Lint enforces all three. Match surrounding code.

## Commits

[Karma format](https://karma-runner.github.io/6.4/dev/git-commit-msg.html):

```
<type>(<scope>): <subject>

<body>

<footer>
```

- `type`: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
- `scope`: the area touched, e.g. `api`, `platform`, `db`, `ui`, `auth`, `docs`. Optional.
- `subject`: imperative, lowercase, no trailing period, ≤ 72 chars.
- `body` (optional): what and why, not how. `footer` (optional): `Closes #123`, `BREAKING CHANGE: ...`.
- Small commits: one logical change each. Split unrelated changes, and keep docs with the code they describe.
- `pnpm format`, `pnpm lint`, `pnpm build` pass before committing.
