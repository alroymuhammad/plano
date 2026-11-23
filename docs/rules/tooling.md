# Tooling

- Package manager: pnpm only. Add deps with `pnpm --filter <name> add`, root tooling with `pnpm add -Dw`.
- `pnpm lint` — oxlint. Must pass. Custom rules live in the local plugin `tooling/oxlint/plano.mjs` (decision 0012).
- `pnpm format` — `oxlint --fix`, then oxfmt (writes files). Run before committing.
- `pnpm build` — builds/typechecks all apps. Must pass.
- Dev: `docker compose up -d`, `pnpm db:migrate`, then `pnpm dev:api`, `pnpm dev:platform`.
- DB: `pnpm db:generate` (migration from schema), `pnpm db:migrate` (apply).
- Style: no semicolons, single quotes, a blank line before and after every `if` (decision 0012). Match surrounding code.

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
