# 0004 — Per-user Library and Document Tiers

Status: accepted (OCR line superseded by 0011)
Date: 2026-11-20

## Problem

Case analysis touches many document types, but only a few can be parsed, tuned, and evaluated well in two weeks.

## Decision

- Each Analyst has one Library, shared across all their Analysis Sessions. It is filled by PDF upload or [Document Discovery](0005-document-discovery.md).
- **Tier 1** (parsed, tuned, evaluated): RTRW, RDTR + Peraturan Zonasi, RPJMD/RPJPD. If scope has to shrink, keep the development plans (RPJMD/RPJPD), because those are what the user cares about.
- **Tier 2** (searchable only): sectoral and building rules, national rules (UU Cipta Kerja, PP 21/2021, Permen ATR KKPR), KLHS.
- Zoning matrices and lampiran tables: inspect the real PDFs on day 1. If extraction is bad, enter the matrix for 1–2 zones by hand as structured data. No OCR. Scanned PDFs are flagged as unsupported.

## Success

Questions about Tier 1 documents meet the eval targets. Tier 2 documents can be found and cited.
