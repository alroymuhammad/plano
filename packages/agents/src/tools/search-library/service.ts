import type { TextDocument } from '@anvia/core/documents'
import { retrieveDocuments, type VectorSearchResult } from '@anvia/core/vector-store'
import type { PassageMetadata, SearchLibraryOptions } from '../../types'
import { getEmbeddingModel } from '../../utils/embedding'
import { ensurePassageStore } from '../../utils/qdrant'

// The filters come from code, never from the model: this Analyst's confirmed, active documents (product 0006, 0007).
export async function searchLibrary({
  analystId,
  query,
  documentIds,
  topK,
  embeddingModel,
  collectionName,
  abortSignal,
}: SearchLibraryOptions & {
  analystId: string
  query: string
  documentIds?: string[] | undefined
  topK: number
  abortSignal?: AbortSignal | undefined
}) {
  const scope = { analystId, confirmed: true, status: 'active' }
  const filter = documentIds ? { ...scope, documentId: { in: documentIds } } : scope

  const results = await retrieveDocuments<TextDocument<PassageMetadata>, PassageMetadata>({
    model: embeddingModel ?? getEmbeddingModel('RETRIEVAL_QUERY'),
    store: await ensurePassageStore(collectionName),
    query,
    topK,
    filter,
    abortSignal,
  })

  return results.map(toPassage)
}

function toPassage({
  id,
  score,
  document,
  metadata,
}: VectorSearchResult<TextDocument<PassageMetadata>, PassageMetadata>) {
  if (!metadata) throw new Error(`Passage ${id} has no payload in Qdrant`)

  return {
    passageId: id,
    document: {
      title: metadata.title,
      type: metadata.type,
      number: metadata.number ?? null,
      year: metadata.year ?? null,
    },
    pageStart: metadata.pageStart,
    pageEnd: metadata.pageEnd,
    heading: metadata.heading,
    // The indexed text is the heading, a newline, then the Passage text (ingest-document/pipeline.ts).
    quote: document.text.slice(metadata.heading.length + 1),
    score,
  }
}
