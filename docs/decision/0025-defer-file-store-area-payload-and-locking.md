# 0025 — Defer the file store, the Area payload, and ingest locking

Status: accepted (amends 0020 and 0023)
Date: 2026-11-25

## Context

[0020](0020-qdrant-vectors-postgres-source.md) planned a file store (`put`, `get`, `url`) and an Area, period, and tier payload for filtering. [0023](0023-qdrant-payload-text-and-passage-ids.md) changed the payload but kept the rest. The RAG slice builds ingestion without these three parts, on purpose.

## Decision

- **File store (amends 0020).** There is no file-store abstraction yet. Ingest copies the PDF to `storageDir` and stores its `file://` URI. R2 replaces that one copy step later, with no schema change.
- **Payload (amends 0020).** Qdrant payloads have no Area, period, or tier fields yet. Those filters are out of scope ([product 0007](../product/0007-provision-selection.md)). When they are built, the fields go into the payload and the points are re-indexed from Postgres.
- **Locking (amends 0023).** Ingest takes no lock. Two concurrent ingests of the same file by one Analyst can collide: the second fails on the unique `(analystId, fileHash)` constraint, or a retry discards a run still in progress, deleting its row, file, and points while its index step may still write points. This is acceptable until ingestion runs through a job queue.

## Consequences

The copy step is the only part R2 has to change. Two runs of one file at the same time can leave orphan points, so "no orphan points from retries" in 0023 holds only for runs that do not overlap. Filtering by Area or period needs a payload change and a re-index.
