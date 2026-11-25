import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { EmbeddingModel } from '@anvia/core/embeddings'

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333'

export const OCR_DATA_DIR = fileURLToPath(new URL('../data/tessdata', import.meta.url))

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

export async function qdrantRest(method: string, path: string, body?: object) {
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
