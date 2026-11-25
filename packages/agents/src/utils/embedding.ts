import { OpenAIClient } from '@anvia/openai'

// Decision 0026. Changing the model or dimensions means re-embedding every Passage into a new collection.
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

// Called directly on OpenAI, not through the chat gateway (GATEWAY_BASE_URL serves no embeddings).
export function getEmbeddingModel() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) throw new Error('Set OPENAI_API_KEY before embedding')

  return new OpenAIClient({ apiKey, baseUrl: 'https://api.openai.com/v1' }).embeddingModel({
    modelId: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxBatchSize: 100,
  })
}
