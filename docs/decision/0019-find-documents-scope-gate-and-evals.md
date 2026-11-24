# 0019 — Find Documents scope gate and recorded eval suite

Status: accepted
Date: 2026-11-24

## Context

Product [0010](../product/0010-find-documents-scope-and-needed-levels.md) adds a scope check before search. The pipeline from [0017](0017-find-documents-rule-plan.md) needs evals again, and Tavily credits are limited (300 of 1000 used on 2026-11-24). Models follow [0018](0018-gateway-models-only.md).

## Decision

- Pipeline: a `scope` step (one model call, `SCOPE` in `find-documents/instructions.ts`) runs before the 0017 steps. Out of scope returns `status: 'out_of_scope'` with a message. In scope runs the 0017 steps as a nested pipeline and returns `status: 'found'`.
- Evals live in `packages/agents/src/evals/find-documents/`: `cases.ts`, `record.ts`, `deterministic.ts`, `judge.ts`, `eval.ts`.
- Record once, score many times. `pnpm eval:record [caseId ...]` runs the live pipeline and saves each case to `recordings/<id>.json` (output, plan, queries, search results, duration, PDF probes). It skips recorded cases unless `--force`. `pnpm eval [caseId ...] [--no-judge]` scores the recordings and calls no pipeline or Tavily.
- PDF probes run at record time: one ranged GET (first 1 KB) per `pdfUrl`, keeping status, the `%PDF-` header and the size. Free, and the result doesn't change when a link dies later. The judge doesn't read PDF content.
- Deterministic metrics are required and gate the exit code: status, expected documents (type + number + year), URLs from search results, level coverage, same region, no duplicates, bounded run, valid files.
- Judge metrics (`gEval` on `JUDGE_MODEL`) only report: query fit, level reasoning, usefulness.
- Cases cover categories A–G: scope, query fit, jurisdiction, source quality, file validity, efficiency, outcome. Expected documents come from the analyst's Surabaya list.

## Consequences

Recording every in-scope case costs up to 14 Tavily searches each; out-of-scope cases cost none. Scores reflect the recorded run, so record again after changing the pipeline. Search-failure behaviour isn't an eval case because the Tavily client is created once per process.
