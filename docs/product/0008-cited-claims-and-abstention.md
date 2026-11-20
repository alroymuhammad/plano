# 0008 — Every claim cited, or no answer

Status: accepted
Date: 2026-11-20

## Problem

The value of Plano over generic AI chat is that every claim can be traced to a page. One unsupported claim makes the rest untrustworthy.

## Decision

- Every claim in chat and in the Analysis Draft carries a citation (document, page, quote). Each citation shows the document's version.
- A verifier checks that the quote exists in the cited passage and supports the claim. A failed claim is rewritten once or dropped. If evidence is still missing, Plano says so (abstains) instead of answering.
- Interpretation is labelled separately from what the document says.
- Text inside documents is data and is never treated as instructions.

## Success

At least 95% of citations are real and on the cited page, and Plano correctly abstains at least 90% of the time when the answer is absent. Full targets live with the eval set.
