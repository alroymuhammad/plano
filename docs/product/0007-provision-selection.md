# 0007 — Which provisions an answer uses

Status: accepted
Date: 2026-11-20

## Problem

A Case's Area can be given at any level or loosely ("Rungkut", "near the river"). Answers must use the right documents for that Area and period, and must not quietly drop older or conflicting ones.

## Decision

- Area Hierarchy: a seeded Surabaya table (kecamatan, kelurahan, and planning units as they're added). Free-text or vague Areas are resolved to entries in it. A document covering a parent Area also covers its children.
- Documents are selected by metadata first, then RAG. Filter confirmed documents by Area coverage, Document Status (active), and planning period. Rank by specificity (RDTR before RTRW for location detail) and then by Recency. Then search the content of those documents.
- Recency ranks documents but never marks one superseded (see [0006](0006-metadata-card.md)).
- If the scope is ambiguous (for example, which RPJMD period), the agent asks.
- When two active provisions disagree, both are shown under Conflicts. Plano never picks a winner.

## Success

Answers for a kelurahan-level Case cite the RDTR covering that kelurahan, never a superseded document, and conflicts are listed rather than resolved.
