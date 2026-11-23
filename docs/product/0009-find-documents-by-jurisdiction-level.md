# 0009 — Find Documents by Jurisdiction Level

Status: accepted
Date: 2026-11-23

## Problem

Finding the right documents is the backbone of every Case. Assessing a development permit needs rules from three levels at once: national, province, and city. Analysts ask in everyday words ("dokumen terkait izin pembangunan di Surabaya") that don't match official titles, and portals mix documents from every region. Supersedes [0005](0005-document-discovery.md) and renames Document Discovery to Find Documents. Terms: [glossary](glossary.md).

## Decision

- **Find Documents** takes a free-text query and returns a **Documents Result**: a list of **Document Results** grouped by **Jurisdiction Level**, National → Province → City (for Surabaya: national → Jawa Timur → Kota Surabaya).
- Each Document Result has a short title, a description of at most 2 sentences, the source link, the official link (if found), a download link (if found), Source Credibility, Jurisdiction Level, document type, number, and year. Title and description come only from the found text; a number or year not in the text or URL stays blank. Document Status is not shown; it is confirmed later on the [Metadata Card](0006-metadata-card.md).
- A Document Result's level comes from who issued it. Documents from other regions are dropped.
- Within a level: Official first, then other .go.id, then Open Web, then relevance. Top 5 per level. Open Web is never shown as verified. An empty level says so instead of padding.
- A download link that is confirmed dead is never shown. If it can't be checked, it is kept only on Official sources.
- Surabaya only. Other cities and off-topic queries get an out-of-scope reply.
- Nothing is imported until the Analyst confirms it. Manual URL or PDF upload stays available.
- Not in this step: import, chat with documents, API, UI, caching.

## Success

On the eval set: the expected document (matched by type + number + year) is in the top 5 of its level in ≥ 90% of cases. At 100%: official copies rank above unofficial ones, no URL is invented, no confirmed-dead download link is shown, no other-region document appears, and out-of-scope and off-topic queries are rejected.
