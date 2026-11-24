# 0016 — Find Documents as a three-step chain of thought

Status: superseded by 0017
Date: 2026-11-24

## Context

The user replaced the fixed search-and-rules pipeline of [0014](0014-find-documents-pipeline.md) with a simpler chain of thought, to see which step goes wrong and refine it step by step. Supersedes 0014 and [0015](0015-find-documents-eval-suite.md). Product rules that no longer hold (grouping, top 5, credibility order, dead-link check, Surabaya only) are not enforced until the user adds steps for them.

## Decision

- Input: `{ "findDocumentPrompt": "..." }`.
- Step 1 `clarify`: an agent with `webSearch` finds which national, province and city rules apply to the request in the user's city.
- Step 2 `search`: an agent with `webSearch` finds those documents, preferring official sites and PDF files. It may only return URLs from search results.
- Step 3 `answer`: an extractor keeps the relevant documents: title, level, url, pdfUrl, relevance.
- The old eval suite is removed. Evals are rebuilt for this output later.

## Consequences

Each run makes up to 12 searches and takes about 1–2 minutes. Results depend on the model, so they vary between runs. New refinement steps go between `search` and `answer`, or after `answer`.
