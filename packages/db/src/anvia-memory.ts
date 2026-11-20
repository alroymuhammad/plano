import { DrizzleMemoryStore } from '@anvia/memory-drizzle'
import type { Db } from './client'

// Durable agent memory on the app database. Tables come from `schema.ts`.
export function createMemoryStore(db: Db) {
  return new DrizzleMemoryStore({ db })
}
