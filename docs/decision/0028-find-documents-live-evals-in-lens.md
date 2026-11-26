# 0028 — Find Documents evals run live and report to Lens

Status: accepted (amends 0019; cases and metrics amended by 0029)
Date: 2026-11-26

## Context

[0019](0019-find-documents-scope-gate-and-evals.md) recorded runs to `recordings/<id>.json` and scored them offline. The scores never reached Lens: `eval.ts` had no reporter, so the Lens evals page stayed empty while traces showed up. The Analyst reviews runs and scores in Lens, so the recordings are a second copy that goes stale after every pipeline change.

## Decision

- `record.ts` and `recordings/` are removed. `pnpm eval [caseId ...] [--no-judge]` runs the live pipeline for each case, then scores it.
- `eval.ts` passes `client.evalReporter()` to the suite, so every metric score goes to Lens. Each case's output carries its pipeline trace, so its scores are attached to that trace.
- PDF probes run inside the eval, right after the pipeline.
- Cases still live in `cases.ts`; metrics in `deterministic.ts` and `judge.ts` are unchanged.

## Consequences

Every eval run spends Tavily credits: up to 14 searches per in-scope case (decision 0027), none for out-of-scope cases. Run single cases by id while iterating. Scores vary between runs because nothing is replayed.
