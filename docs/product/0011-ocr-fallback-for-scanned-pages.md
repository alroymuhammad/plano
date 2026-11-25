# 0011 — OCR as a fallback for scanned pages

Status: accepted
Date: 2026-11-25

## Problem

[0001](0001-mvp-scope-and-first-user.md) and [0004](0004-library-and-document-tiers.md) ruled out OCR and flagged scanned PDFs as unsupported. Some government PDFs mix text pages with scanned ones, and an Analyst would lose those pages entirely.

## Decision

- Text is read from the PDF's text layer first.
- Only pages with almost no extracted text are OCR'd, as Indonesian text.
- An OCR'd page is marked as such, so a citation to it can say the text came from OCR.
- Zoning matrices and lampiran tables are still entered by hand when extraction is bad (0004).

Supersedes the OCR lines of 0001 and 0004.

## Success

A PDF with some scanned pages becomes searchable and citable on every page, and text-layer pages are never OCR'd.
