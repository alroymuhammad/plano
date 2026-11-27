# 0030 — LLM semantic enrichment for Passages during ingestion

Status: accepted
Date: 2026-11-27

## Context

`ingestDocument` currently embeds `${passage.heading}\n${passage.text}` with only document-level metadata in Qdrant ([0020](0020-qdrant-vectors-postgres-source.md), [0023](0023-qdrant-payload-text-and-passage-ids.md)). Indonesian spatial planning regulations use dense legal phrasing and acronyms (KDB, KLB, GSB, KKPR, PBG, sempadan) that can miss semantic retrieval when an Analyst queries in everyday terms, and `searchLibrary` will need Passage-level metadata filters next. `extractPages` already uses `unpdf` first with an Indonesian Tesseract fallback ([product 0011](../product/0011-ocr-fallback-for-scanned-pages.md)), which stays unchanged.

## Decision

- **Deterministic identity and text.** `documentId`, `pageStart`, `pageEnd`, `heading`, and verbatim `text` remain 100% deterministic from chunking; the LLM never re-emits them.
- **Two-layer enrichment.** A new `enrich` step calls `DEFAULT_MODEL` (`deepseek-v4.1-flash-1017`, [0018](0018-gateway-models-only.md)) in batches of 8 Passages (concurrency 3) to produce two internal retrieval fields per Passage:
  - `topics`: 1–3 values from a fixed, first-principles Indonesian regulation taxonomy (`ketentuan_umum`, `kewenangan`, `substansi_teknis`, `prosedur`, `hak_kewajiban`, `pengawasan_sanksi`, `peralihan_penutup`, `lampiran`).
  - `tags`: 0–6 lowercase free-form Indonesian keywords/synonyms for domain concepts.
- **Zero-leftover placement and failure mode.** `enrich` runs between `chunk` and `save`, wrapped in `removeStoredPdfOnError`, and fails hard after 1 retry per batch. A failure leaves no Postgres rows, no Qdrant points, and no stored PDF; a subsequent retry runs cleanly once without duplicating documents or vectors.
- **Embedding and Qdrant payload.** When non-empty, `topics` and `tags` are appended to the embedded text and stored in the Qdrant payload with `keyword` payload indexes on `topics` and `tags`.
- **Phased rollout (temporary exception to 0020).** Phase 1 ships the pipeline enrichment and Qdrant payload/indexes only. Persisting `topics`/`tags` on Postgres `passage` (restoring full rebuildability from Postgres per 0020) and updating `searchLibrary` (quote stripping + metadata filters + evals) follow in Phase 2.
- **Testability.** `IngestDocumentOptions` accepts an injectable enricher/model (mirroring `embeddingModel` in [0026](0026-openai-embeddings.md)) so tests make zero paid LLM calls.

## Consequences

Vector recall improves on Indonesian legal vocabulary and Qdrant is immediately ready for Passage-level topic/tag filtering. Ingestion latency and LLM cost increase proportionally to Passage count (mitigated by 8-Passage batching). Until Phase 2 lands, Qdrant holds `topics`/`tags` not yet stored in Postgres, and `searchLibrary` will include trailing tag lines in `quote` for enriched Passages until `toPassage()` is updated alongside the new filters.
