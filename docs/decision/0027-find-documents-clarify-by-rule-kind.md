# 0027 — Find Documents clarify by rule kind, in force, at most 5 rules

Status: accepted (MAX_RULES amended by 0029)
Date: 2026-11-26

## Context

The recorded evals of [0019](0019-find-documents-scope-gate-and-evals.md) found 9 of 15 expected documents, and every miss came from `clarify`: search found all 9 rules that clarify named. Clarify read a permit request as permit procedure only (missing RTRW, RDTR, technical and SLF rules) and named a replaced RTRW (Perda 12/2014 instead of 3/2025). For the MVP, correct documents beat many loose ones. Amends [0017](0017-find-documents-rule-plan.md) on the points below; the rest of 0017 still holds.

## Decision

- A rule is something the applicant must follow or comply with for the request. Related, background or optional rules are left out, in both clarify and plan.
- Clarify picks from a list of rule kinds (building law, spatial plan, building technical rules, permit procedure, building certificate) and skips kinds the request doesn't need. A rule the applicant must comply with that fits no listed kind is added as its own kind.
- Clarify confirms each rule is the one in force today and names the newer rule when one replaced it.
- `MAX_RULES` stays 10. It is a ceiling, not a target: clarify and plan list only rules the applicant must comply with.
- The webSearch cap (4) lives only in code (`createWebSearchTool(CLARIFY_SEARCHES)`), not in the instruction.

## Consequences

A run still makes at most 14 searches (4 clarify, 10 rule searches). The list of rule kinds is Surabaya building-permit knowledge; widening scope means revisiting it.
