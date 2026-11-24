# 0010 — Find Documents scope gate and needed levels

Status: accepted
Date: 2026-11-24

## Problem

[0009](0009-find-documents-by-jurisdiction-level.md) assumed every permit needs rules from all three Jurisdiction Levels. In Surabaya the city issues the building permit (PP 16/2021), so asking for a province rule sent the search after documents the Analyst doesn't use. Requests for other cities, fictional places, or other topics also spent searches. Amends 0009 on these two points; the rest of 0009 still holds.

## Decision

- Find Documents is a workspace helper for an Analyst who already knows the field. It collects documents and never decides what applies to a Case.
- A scope check runs first, before any search. Scope is Kota Surabaya. A place outside it, a fictional place, or another topic gets a one-sentence out-of-scope reply in the Analyst's language. Scope widens in steps (East Java, then Indonesia) by changing that one setting; same-name places (Kota and Kabupaten Malang) are handled when scope widens.
- Each Jurisdiction Level is marked needed or not needed for the request. A needed level has at least one Document Result. A level that isn't needed says why instead of being padded.

## Success

On the eval set ([0019](../decision/0019-find-documents-scope-gate-and-evals.md)): out-of-scope, fictional and off-topic requests are rejected with no search, and every skipped level gives a reason.
