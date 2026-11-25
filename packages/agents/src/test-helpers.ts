import { createHash } from 'node:crypto'
import type { EmbeddingModel } from '@anvia/core/embeddings'

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333'

// Deterministic 1536-dimension vectors: identical text gets an identical vector, and no test calls OpenAI.
export function fakeEmbeddingModel({ fail = false }: { fail?: boolean } = {}): EmbeddingModel {
  return {
    provider: 'fake',
    modelId: 'fake-1536',
    dimensions: 1536,
    maxBatchSize: 100,
    async embedTexts(texts) {
      if (fail) throw new Error('Embedding failed (test)')

      return texts.map((document) => {
        const digest = createHash('sha256').update(document).digest()

        return {
          document,
          vector: Array.from({ length: 1536 }, (_, i) => 1 + digest[i % digest.length] / 255),
        }
      })
    },
  }
}

// Qdrant's REST API, the same data its dashboard shows, so tests check the points that were written.
export async function qdrant(method: string, path: string, body?: object) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }

  if (process.env.QDRANT_API_KEY) headers['api-key'] = process.env.QDRANT_API_KEY

  const response = await fetch(`${QDRANT_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} ${await response.text()}`)
  }

  return (await response.json()).result
}
