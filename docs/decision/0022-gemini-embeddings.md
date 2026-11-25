# 0022 — Embeddings with Gemini `gemini-embedding-001`

Status: superseded by 0026
Date: 2026-11-25

## Context

0021 picked OpenAI `text-embedding-3-small`. We have no OpenAI key, and paying for one (or for OpenRouter) in USD from an IDR salary adds about 28% in taxes and fees to a $5 top-up. Checked on 2026-11-25: Google AI Studio's `gemini-embedding-001` is free on the free tier ($0.15 per 1M tokens paid, $0.075 batch), takes up to 2,048 input tokens, outputs 128 to 3,072 dimensions (768, 1536, 3072 recommended), supports retrieval task types, and is stronger on multilingual retrieval. Anvia ships `@anvia/gemini` with `embeddingModel({ modelId, dimensions, taskType, maxBatchSize })`. Supersedes 0021 for the model and provider.

## Decision

- Embed with `gemini-embedding-001` at 1536 dimensions through `@anvia/gemini`, with `GEMINI_API_KEY` from Google AI Studio. Chat models stay on the gateway (`GATEWAY_*`, 0018).
- Passages are embedded with task type `RETRIEVAL_DOCUMENT` at ingest, and search queries with `RETRIEVAL_QUERY`: `getEmbeddingModel(taskType)` in `packages/agents/src/utils/embedding.ts`.
- Use the free tier for development. Move to the paid tier (billed after use, no top-up) before real Analysts' queries go through it, because free-tier inputs may be used to improve Google's products.
- The Gemini SDK has no base-URL override, so tests pass a fake embedding model into the workflow and tool instead of running a stand-in server.

## Consequences

Embeddings cost nothing for now. Passages must stay under 2,048 tokens (our 3,000-character Passages are about 1,000). Free-tier rate limits apply. Switching models still means a new collection and a full re-embed from Postgres (0023).
