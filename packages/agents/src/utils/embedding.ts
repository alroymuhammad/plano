import { GeminiClient } from '@anvia/gemini'

// Decision 0022. Changing the model or dimensions means re-embedding every Passage into a new collection.
export const EMBEDDING_MODEL = 'gemini-embedding-001'
export const EMBEDDING_DIMENSIONS = 1536

// Passages are embedded as documents at ingest and searches as queries, which Gemini tunes separately.
export function getEmbeddingModel(taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) throw new Error('Set GEMINI_API_KEY before embedding')

  return new GeminiClient({ apiKey }).embeddingModel({
    modelId: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxBatchSize: 100,
    taskType,
  })
}
