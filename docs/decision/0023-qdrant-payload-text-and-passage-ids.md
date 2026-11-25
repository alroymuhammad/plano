# 0023 — Qdrant keeps a copy of Passage text; Passage ids are deterministic

Status: accepted (amended by 0025)
Date: 2026-11-25

## Context

0020 says Qdrant holds only vectors plus a filter payload. Checked in `@anvia/qdrant` 1.3.0: every point's payload also carries the serialized Anvia document (`__anvia_document`, the Passage text) and its Anvia id (`__anvia_document_id`), and there is no option to leave them out. The point id is a hash of the Anvia document id, and `delete` takes only Anvia document ids, not our `documentId` payload field. Amends 0020.

## Decision

- Qdrant points carry a copy of the embedded Passage text. Postgres stays the source of truth; `searchLibrary` may quote from the payload because it is the same text, and a rebuild from Postgres rewrites it.
- A Passage's id is `<documentId>:<index>`, and it is the Anvia document id in Qdrant. Re-indexing a document overwrites the same points instead of adding new ones.
- To delete a document's points (a failed earlier run, or re-ingest), read its Passage ids from Postgres and call the store's `delete({ documentIds })` with them, before deleting the Postgres rows.
- The `passages` collection's size (1536) is fixed at creation; `ensure()` throws on a mismatch. A new embedding model means a new collection and a full re-embed from Postgres.

## Consequences

No orphan points from retries, and no native Qdrant filter-delete. Passage text is stored twice, a few MB per document. Postgres rows must be deleted after their points, never before.
