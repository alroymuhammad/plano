# Domain Docs

How the engineering skills should consume this repo's domain documentation. Single context: one glossary and one set of decisions for the whole monorepo.

## Before exploring, read these

- **`docs/product/glossary.md`**: the canonical product terms.
- **`docs/decision/`**: engineering decisions (ADRs). Read the ones that touch the area you're working in.
- **`docs/product/`**: product decisions. Read the ones that touch the user-facing behaviour you're working on.
- **`docs/rules/`**: binding rules per area (see `AGENTS.md`).

Don't create `GLOSSARY.md`, `GLOSSARY-MAP.md` or `docs/adr/`. When `/domain-modeling` resolves a term, it goes in `docs/product/glossary.md`. A new decision goes in `docs/decision/NNNN-name.md` (engineering) or `docs/product/NNNN-name.md` (product), using `0000-template.md`. Never edit an accepted decision; add one that supersedes it and mark the old one `superseded by NNNN`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the glossary. Don't drift to synonyms it lists under _Avoid_.

If the concept you need isn't in the glossary yet, either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag decision conflicts

If your output contradicts an accepted decision, surface it explicitly rather than silently overriding:

> _Contradicts decision 0014 (Find Documents pipeline), but worth reopening because…_
