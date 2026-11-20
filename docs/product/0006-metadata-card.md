# 0006 — Agent-proposed, Analyst-confirmed Metadata Card

Status: accepted
Date: 2026-11-20

## Problem

Version-aware answers depend on each document's status, Area, period, and supersession links. Government PDFs are messy, and students won't fill in long forms. Fully manual entry leaves fields blank. Fully automatic entry produces silent status errors that corrupt every answer that follows.

## Decision

- On import, the agent pre-fills the Metadata Card (type, number and year, Area, planning period, effective date, Document Status, amends/supersedes links) from the title page, consideranda, revocation clauses, and effective-date article. Each field comes with a supporting quote.
- A document is not searchable until the Analyst confirms its card.
- Supersession is proposed only from explicit revoke or amend text in another Library document, never from dates. The Analyst confirms it.

## Success

No unconfirmed document appears in answers. No document is marked superseded without an explicit clause and the Analyst's confirmation.
