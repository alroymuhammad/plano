import { QdrantVectorClient } from '@anvia/qdrant'

let client: QdrantVectorClient | undefined

// Local Qdrant (docker compose) needs no key. Qdrant Cloud sets QDRANT_URL and QDRANT_API_KEY (decision 0020).
export function getQdrantClient() {
  client ??= new QdrantVectorClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
  })

  return client
}
