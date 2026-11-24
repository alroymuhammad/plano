# 0017 — Find Documents plans rules before it searches

Status: accepted
Date: 2026-11-24

## Context

In [0016](0016-find-documents-three-step-pipeline.md), clarify had to name a rule for every level, so for Surabaya it sent search after a province Perda that PBG doesn't need (PP 16/2021 gives PBG authority to the city). The search agent spent its searches unevenly and dropped rules. Its "at most N searches" was only a prompt. Supersedes 0016.

## Decision

- `clarify`: an agent works backwards from the goal in the user's city. With `webSearch` capped at 4 calls per run, it confirms which level holds authority, whether each level is needed and why, and which rules apply.
- `plan`: an extractor turns that into `RulePlan`: city, province, levels (needed, reason), and up to 10 rules (type, region, number, year, subject) from needed levels only.
- `queries`: code builds one query per rule: `type region Nomor n Tahun y`, or `type region subject` when the number is unknown.
- `search`: code runs one basic Tavily search per query, in parallel, with no domain filter. A failed search stops the run with `search feat is unable to proceed due to <problem>`.
- `answer`: an extractor picks each rule's document from its results, and returns levels, documents and `notFound`.

## Consequences

A run makes at most 14 searches, and none for levels that aren't needed. A rule the search misses shows up in `notFound` instead of using up retries. A missed query isn't rephrased, and a rule clarify doesn't name is never searched.
