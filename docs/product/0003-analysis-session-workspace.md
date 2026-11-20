# 0003 — Analysis Session workspace

Status: accepted
Date: 2026-11-20

## Problem

An Analyst works on one Case at a time and needs the chat, the evidence, and the written analysis kept together. A generic "project" or chat thread doesn't capture what the Case is.

## Decision

The Analysis Session is the unit of work. It replaces "project".

- Entry: a Purpose Prompt ("what are you analysing?") plus a Draft Template choice (for example, permit header only or full analysis). What each template contains is not decided yet.
- The prompt is narrowed into Case Details (activity, Area, zone, scale). These become the session's title and header.
- The session holds the chat and the Analysis Draft. In chat the Analyst can ask about Library documents (cited, see [0008](0008-cited-claims-and-abstention.md)), work on the Draft, and run [Document Discovery](0005-document-discovery.md) or web search.
- **Generate analysis** reuses the evidence from the chat, retrieves again to fill gaps, and writes an editable Analysis Draft with inline citations. Conflicts go in their own block and are never merged.
- Clicking a citation opens the PDF at the cited page with the passage highlighted.
- A lightweight Compare mode (two document versions → added / removed / modified, explicit changes kept apart from interpretation). This is the first thing to cut if time runs short.

## Success

The Analyst goes from a Purpose Prompt to an edited Analysis Draft in a single session without leaving it.
