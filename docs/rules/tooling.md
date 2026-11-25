# Tooling

- Package manager: pnpm only. Add deps with `pnpm --filter <name> add`, root tooling with `pnpm add -Dw`.
- `pnpm lint` — oxlint. Must pass. Custom rules live in the local plugin `tooling/oxlint/plano.mjs` (decision 0012).
- `pnpm format` — `oxlint --fix`, then oxfmt (writes files). Run before committing.
- `pnpm build` — builds/typechecks all apps. Must pass.
- Dev: `docker compose up -d` starts Postgres (`localhost:54329`) and Qdrant (REST on `localhost:6333`, dashboard at `http://localhost:6333/dashboard`, gRPC on `6334`). Then `pnpm db:migrate`, then `pnpm dev:api`, `pnpm dev:platform`.
- Qdrant and embeddings env (decisions 0020, 0026): `QDRANT_URL` (default `http://localhost:6333`) and `QDRANT_API_KEY` configure the Qdrant client in `packages/agents`. The key is sent only when set: leave it empty for local Qdrant, set it for Qdrant Cloud. `OPENAI_API_KEY` is for embeddings only, called directly on OpenAI (decision 0026); chat models use `GATEWAY_*`. A Qdrant collection built with another embedding model must be dropped and re-ingested.
- Studio: `pnpm dev:studio` serves Anvia Studio on port 4021 (`http://localhost:4021/playground`, or `RUNNER_PORT`) with the Find Documents pipeline (decisions 0017, 0019), the Ingest Document pipeline, and a disposable Plano chat agent that can call `searchLibrary` for the dev Analyst. Find Documents input: `{ "findDocumentPrompt": "..." }`; it needs `TAVILY_API_KEY` in `.env`. Studio needs `DATABASE_URL` and the `GATEWAY_*` vars at startup, even for Find Documents. Ingest Document input: `{ "path": "/absolute/file.pdf", "title": "...", "type": "...", "number": null, "year": null, "area": "...", "status": "active" }`; it writes to the Postgres at `DATABASE_URL` as the dev Analyst and copies the PDF into `packages/agents/data/`.
- Evals (decision 0019): `pnpm --filter @plano/agents eval:record [caseId ...]` records live runs (spends Tavily credits; skips recorded cases unless `--force`); `pnpm --filter @plano/agents eval [caseId ...] [--no-judge]` scores the recordings. With `ANVIA_LENS_*` set, `eval:record` runs and judge calls also trace to Lens (see Lens below).
- Tests (decision 0024): `pnpm --filter @plano/agents test` runs `src/**/*.test.ts` with Node's test runner through `tsx`. Ingest tests use the local Postgres (`docker compose up -d postgres`, `pnpm db:migrate`) and make no paid calls. They read the RTRW fixture at `packages/agents/data/2025perda3578003.pdf` (gitignored; copy Perda Surabaya 3/2025 there) and skip with a message when it is missing. The `searchLibrary` tests use the same Postgres and Qdrant with generated PDFs and need no fixture.
- OCR (product 0011) reads scanned pages in Indonesian with tesseract.js. The first ingest that OCRs a page downloads `ind.traineddata` (about 1.2 MB gzipped) from the jsDelivr CDN into `packages/agents/data/tessdata/` (gitignored; Studio passes this folder as `ocrDataDir`). Every ingest that OCRs a page checks the file's sha256 against `OCR_LANG_SHA256` (`constants.ts`) first. A mismatch deletes the file and fails the ingest; the next run downloads it again. That first run needs network; later runs read the cached file and work offline. The tesseract.js build script is disabled in `pnpm-workspace.yaml` (`allowBuilds`).
- Lens (optional tracing, decision 0013): copy `lens/.env.example` to `lens/.env` with fresh secrets, `pnpm lens:up`, open `http://localhost:8082`, create a project key, set `ANVIA_LENS_*` in `.env`. Lens is a no-op while `ANVIA_LENS_*` is unset, and `createLens()` warns. Once it is set, Lens throws without a service name, so `createLens()` defaults it to `plano` (override with `ANVIA_LENS_SERVICE_NAME`). `lens/docker-compose.yml` is vendored upstream; only local edits are the project name and no `rslave` bind propagation (fails on WSL Docker).
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
