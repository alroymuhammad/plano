import type { TextDocument } from '@anvia/core/documents'
import { retrieveDocuments, type VectorSearchResult } from '@anvia/core/vector-store'
import type { PassageMetadata, SearchLibraryOptions } from '../../types'
import { getEmbeddingModel } from '../../utils/embedding'
import { ensurePassageStore } from '../../utils/qdrant'

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
  const libraryScope = { analystId, confirmed: true, status: 'active' }
  const filter = documentIds ? { ...libraryScope, documentId: { in: documentIds } } : libraryScope

  const results = await retrieveDocuments<TextDocument<PassageMetadata>, PassageMetadata>({
    model: embeddingModel ?? getEmbeddingModel(),
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

  const quoteStart = metadata.heading.length + '\n'.length

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
    quote: document.text.slice(quoteStart),
    score,
  }
}
