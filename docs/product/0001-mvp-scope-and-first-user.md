# 0001 — MVP scope and first user

Status: accepted (OCR line superseded by 0011)
Date: 2026-11-20

## Problem

Planology students analyse development and permit Cases against regional planning documents. Those documents run to hundreds of pages, sit across many portals, and exist in several versions and periods. Finding the right provision, checking it is still in force, and citing the page takes days. Superseded rules get cited, and contradictions get merged without anyone noticing. Generic AI chat sounds right but can't point to a page.

## Decision

Plano is a Jenni.ai-style research workspace where an Analyst analyses a Case against planning documents and gets cited provisions back. Terms: [glossary](glossary.md).

- Goal: a mentor-reviewed 2-week build that one real user also tries.
- First Analyst: a planology student who analyses Surabaya development and permit Cases. Government reviewers and verifiers come later. We keep their terms but don't build their features (audit, roles).
- Jurisdiction: Surabaya only.
- Won't build: GIS, OCR for scanned PDFs, bulk crawling of government portals, real-time collaboration, citation-style export (APA etc.), auto-detected supersession, government roles or audit.

## Success

The student goes from a Purpose Prompt to an Analysis Draft where every claim opens the exact PDF page, in minutes instead of days, with no unsupported claims.
