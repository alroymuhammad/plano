# 0021 — Embeddings with OpenAI `text-embedding-3-small`

Status: superseded by 0022
Date: 2026-11-25

## Context

0018 routes every model call through the Devscale gateway. Checked on 2026-11-25: the gateway's `/v1/embeddings` route exists but serves no embedding model ("Unknown model"), and Devscale won't add one. The alternative was self-hosting `bge-m3`: free, strong on Indonesian, with sparse vectors, but it means running and deploying a model server. The budget for embeddings is $2–5.

## Decision

- Passages and queries are embedded with `text-embedding-3-small` (1536 dimensions), called directly on OpenAI with `@anvia/openai` `embeddingModel()` and `OPENAI_API_KEY`. This is the one exception to 0018's gateway-only rule.
- The embedding model id, base URL, and dimensions come from config, so a self-hosted OpenAI-compatible server (such as `bge-m3`) can replace it later. Switching models means re-embedding every Passage.
- Measured cost: Surabaya's RTRW (Perda 12/2014, 172 pages) is about 98k tokens, under $0.01 to embed with overlap and headers.

## Consequences

Document text is sent to OpenAI. The model is dense only, so keyword matching for hybrid search needs our own sparse (BM25-style) model. Supersedes 0018 for embeddings only.
