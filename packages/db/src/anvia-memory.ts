import { DrizzleMemoryStore } from '@anvia/memory-drizzle'
import type { Db } from './client'

export function createMemoryStore(db: Db) {
  return new DrizzleMemoryStore({ db })
}
