import { OpenAIClient } from '@anvia/openai'

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

export function getEmbeddingModel() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) throw new Error('Set OPENAI_API_KEY before embedding')

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

  return new OpenAIClient({ apiKey, baseUrl }).embeddingModel({
    modelId: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxBatchSize: 100,
  })
}
