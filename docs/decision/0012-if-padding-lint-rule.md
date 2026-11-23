# 0012 — Blank lines around `if` via oxlint

Status: accepted
Date: 2026-11-23

## Context

We want a blank line before and after every `if` statement. oxfmt (like Prettier) keeps blank lines but never adds them, and has no option for it. oxlint has no native padding rule. Extends 0004.

## Decision

- A local oxlint JS plugin, `tooling/oxlint/plano.mjs`, defines `plano/padding-around-if` (with autofix). It's loaded via `jsPlugins` in `.oxlintrc.json`. Our own oxlint rules go in this plugin.
- `pnpm format` runs `oxlint --fix` before oxfmt, so the blank lines are added automatically.

## Consequences

No new dependency; we maintain the rule ourselves. oxlint JS plugins are alpha and not covered by semver; recheck the rule after oxlint upgrades. An `if` that opens a block gets no blank line above it, since the rule only applies between statements.
