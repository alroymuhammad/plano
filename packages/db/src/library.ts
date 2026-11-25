import { and, eq } from 'drizzle-orm'
import { document, documentPage, passage } from './schema'
import type { Db } from './types'

// Library writes for Ingest Document. The caller builds it and passes it to `@plano/agents`, which imports only the type (decision 0020).
export function createLibraryStore(db: Db) {
  return {
    async findDocumentByHash(analystId: string, fileHash: string) {
      const [row] = await db
        .select({ id: document.id })
        .from(document)
        .where(and(eq(document.analystId, analystId), eq(document.fileHash, fileHash)))

      return row ?? null
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
  }
}

export type LibraryStore = ReturnType<typeof createLibraryStore>
