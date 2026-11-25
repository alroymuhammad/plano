import type { TextDocument } from '@anvia/core/documents'
import { type QdrantClientLike, QdrantVectorClient } from '@anvia/qdrant'
import type { PassageMetadata } from '../types'
import { EMBEDDING_DIMENSIONS } from './embedding'

let client: QdrantVectorClient | undefined

// Local Qdrant (docker compose) needs no key. Qdrant Cloud sets QDRANT_URL and QDRANT_API_KEY (decision 0020).
export function getQdrantClient() {
  client ??= new QdrantVectorClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
  })

  return client
}

const PASSAGES_COLLECTION = 'passages'

// Payload fields that Passage search filters on (decision 0020). The Anvia adapter doesn't create them.
const PAYLOAD_INDEXES = [
  ['analystId', 'keyword'],
  ['documentId', 'keyword'],
  ['status', 'keyword'],
  ['confirmed', 'bool'],
] as const

// The official Qdrant client behind the adapter, the only way to create payload indexes.
type PayloadIndexClient = QdrantClientLike & {
  createPayloadIndex(
    collection: string,
    options: { field_name: string; field_schema: string; wait: boolean },
  ): Promise<unknown>
}

const passageStores = new Map<string, ReturnType<typeof createPassageStore>>()

// Creates the collection and its payload indexes once per process. Both are idempotent in Qdrant.
export function ensurePassageStore(collectionName = PASSAGES_COLLECTION) {
  let ready = passageStores.get(collectionName)

  if (!ready) {
    ready = createPassageStore(collectionName)
    passageStores.set(collectionName, ready)
    // A failed setup is retried on the next call instead of being cached.
    ready.catch(() => passageStores.delete(collectionName))
  }

  return ready
}

async function createPassageStore(collectionName: string) {
  const store = getQdrantClient().vectorStore<TextDocument<PassageMetadata>, PassageMetadata>({
    collectionName,
    dimensions: EMBEDDING_DIMENSIONS,
    metric: 'cosine',
  })

  await store.ensure()

  const native = (await getQdrantClient().nativeClient()) as PayloadIndexClient

  for (const [field_name, field_schema] of PAYLOAD_INDEXES) {
    await native.createPayloadIndex(collectionName, { field_name, field_schema, wait: true })
  }

  return store
}
