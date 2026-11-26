# 0029 — Find Documents evals check anchors, and a run makes at most 10 searches

Status: accepted (amends 0027, 0028)
Date: 2026-11-26

## Context

`clarify` picks the rule set on every run (0027), so the full expected lists of type, number and year in `cases.ts` failed whenever it picked a different valid set. Several metrics also didn't test the pipeline. `bounded` checked the query count after `plan` had already sliced it, and a run was failed at 180 s but killed at 300 s. `level-coverage` and `no-duplicates` scored details the Analyst doesn't review. The judges (query fit, level reasoning, usefulness) were too vague to sharpen. Each Tavily search costs one credit, whatever `maxResults` is.

## Decision

- Cases live in `requests.ts`. An in-scope request lists 1–2 **anchors**, the documents it must return whatever else clarify picks. An out-of-scope request lists only its status.
- Deterministic metrics: `status` (no error and the right status), `anchors`, `url-in-source`, `same-region`, `valid-files` (every document has a `pdfUrl` that is a real PDF). `level-coverage`, `no-duplicates` and `bounded` are removed.
- Judges: `in-force` (no revoked or replaced rule; grow `REPLACED_RULES` as new cases come up), `redirect` (an out-of-scope message says why and points to Surabaya development permits), and `relevance-grounded` (each relevance line is specific to the request).
- `MAX_RULES` goes from 10 to 6. Clarify lists rules most important first, so the anchors stay in.

## Consequences

A run makes at most 10 Tavily searches (4 clarify, 6 rule searches). A request that needs more than 6 rules loses the least important ones. Watch the `anchors` metric for misses. Limits on run time and document count are not checked for now.
