# 0026 — Embeddings with OpenAI `text-embedding-3-small`, direct

Status: accepted
Date: 2026-11-25

## Context

0022 chose Gemini `gemini-embedding-001`. The owner can only pay OpenAI, so Google AI Studio is out. OpenAI `text-embedding-3-small` is the model 0021 picked; 0021 stays as history. The Devscale gateway still serves no embedding model (0018 checked), so embeddings call OpenAI directly. Supersedes 0022.

## Decision

- Embed with `text-embedding-3-small` at 1536 dimensions through `@anvia/openai` `embeddingModel()`, using `OPENAI_API_KEY` and the base URL `https://api.openai.com/v1`, never `GATEWAY_BASE_URL`. This is the one exception to 0018's gateway-only rule. Chat models stay on the gateway.
- `getEmbeddingModel()` in `packages/agents/src/utils/embedding.ts` takes no arguments: OpenAI has no document or query task types, so ingest and `searchLibrary` use the same model.
- Tests keep passing a fake embedding model into the workflow and tool, so they make no paid calls.
- `@anvia/gemini` is removed.

## Consequences

Document text is sent to OpenAI. Embedding costs $0.02 per 1M tokens, about $0.002 for a 98k-token document. The input limit is 8,191 tokens, far above our 3,000-character Passages. The 1536-dimension `passages` collection is unchanged, but vectors from another model must never share it: switching models means a new collection and a full re-embed from Postgres (0023).
