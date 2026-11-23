# AGENTS.md

Constraints for anyone (human or agent) changing this repo. Details live in `docs/`; this file says how to use them.

## Docs

- Before writing code, read the `docs/rules/` file(s) for the area you touch: `backend`, `frontend`, `packages`, `architecture`, `tooling`. Always read `architecture` and `tooling`.
- Rules are binding. If code and a rule disagree, follow the rule, or change the rule first. Never silently break one.
- Before making a non-obvious technical choice, check `docs/decision/`. Don't contradict an accepted decision.
- Before building or changing user-facing behavior, check `docs/product/`. Don't contradict an accepted product decision.
- Record a new engineering decision in `docs/decision/NNNN-name.md` and a product decision in `docs/product/NNNN-name.md`, using `0000-template.md`. Next number = highest existing + 1.
- Don't edit an accepted decision. Add a new one that supersedes it, and mark the old one `superseded by NNNN`.
- If you change how the codebase should be worked on, update the matching `docs/rules/` file in the same change.
- Docs stay short. Don't duplicate content across docs; link instead.

## Work

- Do the smallest thing that solves the task. No speculative abstractions, no unrequested features.
- Match surrounding code: naming, comments, style.
- Don't add dependencies without need. Use pnpm only, via `pnpm --filter <name> add`.
- Don't edit generated files (`routeTree.gen.ts`).
- Never commit secrets or `.env`.

## Before finishing

- `pnpm format`, `pnpm lint`, and `pnpm build` must pass.
- State what you verified and what you didn't.

## Agent skills

### Issue tracker

GitHub Issues on `alroymuhammad/plano`, via `gh`, with sub-issues and native blocked-by links. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: glossary in `docs/product/glossary.md`, decisions in `docs/decision/` and `docs/product/`. See `docs/agents/domain.md`.
