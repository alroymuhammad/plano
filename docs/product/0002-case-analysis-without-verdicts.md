# 0002 — Case analysis support, never a verdict

Status: accepted
Date: 2026-11-20

## Problem

The first Analyst's job is analysing permit Cases, which the original plan excluded. A verdict ("permitted / not permitted") or a recommendation would put legal judgment on the AI, and there is no ground truth to evaluate one against.

## Decision

Plano supports Case analysis but never gives a verdict or a recommendation. The Analyst writes the conclusion.

- Plano finds the Applicable Provisions, shows what each one says about the Case, and lists conflicts.
- It may quote a Zoning Classification (I/T/B/X), always alongside the Activity Mapping it depends on (zone + activity row) so the Analyst can check that mapping.
- No overall classification, score, or suggestion for the Case.

## Success

Every output claim either matches a quote from a document or it is dropped. No screen or generated text states a permit outcome.
