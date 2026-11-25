import { and, eq } from 'drizzle-orm'
import { document, documentPage, passage } from './schema'
import type { Db } from './types'

// Library writes for Ingest Document. The caller builds it and passes it to `@plano/agents`, which imports only the type (decision 0020).
export function createLibraryStore(db: Db) {
  return {
    async findDocumentByHash(analystId: string, fileHash: string) {
      const [row] = await db
        .select({ id: document.id, indexedAt: document.indexedAt, storageUri: document.storageUri })
        .from(document)
        .where(and(eq(document.analystId, analystId), eq(document.fileHash, fileHash)))

      return row ?? null
    },

    async findPassageIds(documentId: string) {
      const rows = await db
        .select({ id: passage.id })
        .from(passage)
        .where(eq(passage.documentId, documentId))

      return rows.map((row) => row.id)
    },

    // One transaction: a document is either stored with its pages and Passages, or not at all.
    async saveDocument(input: {
      document: typeof document.$inferInsert
      pages: (typeof documentPage.$inferInsert)[]
      passages: (typeof passage.$inferInsert)[]
    }) {
      await db.transaction(async (tx) => {
        await tx.insert(document).values(input.document)
        await tx.insert(documentPage).values(input.pages)

        // A PDF with no text layer has no Passages yet. Drizzle rejects an empty insert.
        if (input.passages.length > 0) await tx.insert(passage).values(input.passages)
      })
    },

    async markIndexed(documentId: string) {
      await db.update(document).set({ indexedAt: new Date() }).where(eq(document.id, documentId))
    },

    // Pages and Passages go with the document (cascade). Delete its Qdrant points first (decision 0023).
    async deleteDocument(documentId: string) {
      await db.delete(document).where(eq(document.id, documentId))
    },
  }
}

export type LibraryStore = ReturnType<typeof createLibraryStore>
