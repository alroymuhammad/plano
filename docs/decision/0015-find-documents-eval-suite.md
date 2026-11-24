# 0015 — Find Documents eval suite runtime

Status: superseded by 0016
Date: 2026-11-24

## Context

The eval suite in `packages/agents/src/evals/` runs the live Find Documents pipeline ([0014](0014-find-documents-pipeline.md)). A case makes one read-query model call and three Tavily searches, one per level. `@tavily/core` 1.1.0 has no abort or signal option, so a case timeout cannot stop a search that is already running.

## Decision

- The target calls `findDocuments(query)` and forwards the case signal. The download-link stage honors it. A Tavily search already in flight keeps running after the signal fires.
- `targetConcurrency: 2` and `caseTimeoutMs: 120000`. The budget covers the model call, the parallel searches and the 8 s download stage, with headroom (comment in `suite.ts`).
- A timed-out or failed target makes every metric invalid, so the run exits 2.
- The terminal runner exits 0 when no required metric fails, 1 when a required metric fails, and 2 when a required metric is invalid or the arguments are wrong.
- Trust metrics are BOOLEAN checks, one file each in `evals/metrics/`, each with negative and positive controls that `evals/controls.ts` runs. No LLM judges.
- Lens reporting stays in the dev entries (`studio.ts`, `evals/run.ts`), as in [0013](0013-anvia-lens.md).

## Consequences

Two cases at a time means at most six searches in flight. A timed-out case can leave Tavily searches running after it reports. The exit code counts only metrics marked `required`, so a metric that omits it does not gate a run.
