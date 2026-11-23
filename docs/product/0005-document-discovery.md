# 0005 — Document Discovery across sources

Status: superseded by 0009
Date: 2026-11-20

## Problem

Planning documents are scattered across portals. JDIHN has no official API, and any single source is incomplete.

## Decision

- Discovery searches JDIHN, the official JDIH / BPK / GISTARU portals, and web search in parallel, then merges duplicates.
- Results are ranked first by a fixed Source Credibility order defined in code (Official > other .go.id > Open Web), then by relevance.
- Nothing is imported until the Analyst confirms it. An imported document then goes through its [Metadata Card](0006-metadata-card.md).
- Open Web documents are never shown as verified.
- Manual URL or PDF upload stays available as a fallback.

## Success

For a Surabaya Case, the official RTRW / RDTR shows up above unofficial copies, and nothing enters the Library without confirmation.
