import type { TextDocument } from '@anvia/core/documents'
import { type QdrantClientLike, QdrantVectorClient } from '@anvia/qdrant'
import type { PassageMetadata } from '../types'
import { EMBEDDING_DIMENSIONS } from './embedding'

let client: QdrantVectorClient | undefined

export function getQdrantClient() {
  client ??= new QdrantVectorClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
  })

  return client
}

const PASSAGES_COLLECTION = 'passages'

const PAYLOAD_INDEXES = [
  ['analystId', 'keyword'],
  ['documentId', 'keyword'],
  ['status', 'keyword'],
  ['confirmed', 'bool'],
] as const

type PayloadIndexClient = QdrantClientLike & {
  createPayloadIndex(
    collection: string,
    options: { field_name: string; field_schema: string; wait: boolean },
  ): Promise<unknown>
}

const passageStores = new Map<string, ReturnType<typeof createPassageStore>>()

export function ensurePassageStore(collectionName = PASSAGES_COLLECTION) {
  let ready = passageStores.get(collectionName)

  if (!ready) {
    ready = createPassageStore(collectionName)
    passageStores.set(collectionName, ready)
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
