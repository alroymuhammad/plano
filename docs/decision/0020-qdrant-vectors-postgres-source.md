# 0020 — Qdrant for vectors, Postgres as source of truth, files behind a store

Status: accepted (payload and Passage ids amended by 0023; file store and payload fields amended by 0025)
Date: 2026-11-25

## Context

The agent answers from Library documents (PDFs) with Passages cited by document, page, and quote (product 0008). That needs vector search with metadata filters (product 0007), a durable record of documents and their text, and somewhere to keep the PDF files. pgvector was the alternative; we chose a dedicated vector store.

## Decision

- **Postgres (Drizzle, `packages/db`)** is the source of truth: documents, Metadata Card fields, page text, Passage text with page spans, and each file's `storageUri`.
- **Qdrant** holds only vectors plus a filter payload (Analyst, document, confirmed, status, Area, period, tier, pages). It can be rebuilt from Postgres at any time. Access goes through `@anvia/qdrant` (REST, port 6333). The client lives in `packages/agents`, not `packages/db`, because only ingestion and `searchLibrary` use it.
- Local Qdrant runs in the root `docker-compose.yml` with ports 6333 (REST and the dashboard at `/dashboard`) and 6334 (gRPC), plus a named volume.
- **PDF files** go through a small file store (`put`, `get`, `url`). It is local disk now (`file://`) and an S3-compatible bucket later (`s3://`, Cloudflare R2 planned), with no schema change.

## Consequences

Two stores have to be kept in sync. Ingestion writes Postgres first, then Qdrant, and a document's points are replaced on re-ingest. Payload indexes for the filter fields are created by our code; the adapter doesn't create them. Deploying requires a Qdrant instance (self-hosted or Qdrant Cloud) and a bucket.
