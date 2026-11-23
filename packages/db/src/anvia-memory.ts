import { DrizzleMemoryStore } from '@anvia/memory-drizzle'
import type { Db } from './types'

export function createMemoryStore(db: Db) {
  return new DrizzleMemoryStore({ db })
}
