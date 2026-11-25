import { createHash, randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Pipeline } from '@anvia/core/pipeline'
import { ingestVectorDocuments } from '@anvia/core/vector-store'
import { z } from 'zod'
import {
  IngestDocumentInputSchema,
  type IngestDocumentOptions,
  type IngestDocumentResult,
  type PassageMetadata,
} from '../../types'
import { getEmbeddingModel } from '../../utils/embedding'
import { ensurePassageStore } from '../../utils/qdrant'
import { chunkPages } from './chunk'
import { PASSAGE_INDEX_CONCURRENCY } from './constants'
import { extractPages } from './extract'

// A Passage's id is also its Anvia document id in Qdrant, so indexing it again overwrites its point (decision 0023).
const passageId = (documentId: string, index: number) => `${documentId}:${index}`

export function createIngestDocumentPipeline(options: IngestDocumentOptions) {
  const newDocumentPipeline = createNewDocumentPipeline(options)

  return new Pipeline({
    id: 'ingest-document',
    name: 'Ingest Document',
    inputSchema: IngestDocumentInputSchema,
    observability: options.observability,
  })
    .step({
      id: 'hash',
      run: async ({ input }) => {
        const fileHash = createHash('sha256')
          .update(await readFile(input.path))
          .digest('hex')
        const existing = await options.library.findDocumentByHash(options.analystId, fileHash)

        return { ...input, fileHash, existing }
      },
    })
    .step({
      id: 'ingest',
      run: async ({ input: { existing, ...file }, abortSignal }): Promise<IngestDocumentResult> => {
        if (existing?.indexedAt) return { documentId: existing.id, skipped: true }

        if (existing) await discardUnindexed(options, existing)

        const { output } = await newDocumentPipeline.run({
          input: { ...file, documentId: randomUUID() },
          abortSignal,
        })

        return output
      },
    })
}

// A document whose run failed before indexing: its Qdrant points go first, then its rows, then its file.
async function discardUnindexed(
  options: IngestDocumentOptions,
  existing: { id: string; storageUri: string },
) {
  const passageIds = await options.library.findPassageIds(existing.id)

  if (passageIds.length > 0) {
    const store = await ensurePassageStore(options.collectionName)
    await store.delete({ documentIds: passageIds })
  }

  await options.library.deleteDocument(existing.id)
  await rm(fileURLToPath(existing.storageUri), { force: true })
}

// A stored PDF with no row is an orphan, so a failed step before save removes it. Index runs after save, and
// its failure keeps the file: the row exists, and the retry path discards both.
async function removeStoredPdfOnError<T>(
  storageUri: string,
  step: () => T | Promise<T>,
): Promise<T> {
  try {
    return await step()
  } catch (error) {
    await rm(fileURLToPath(storageUri), { force: true })
    throw error
  }
}

function createNewDocumentPipeline(options: IngestDocumentOptions) {
  return new Pipeline({
    id: 'ingest-document-new',
    name: 'Ingest Document (new file)',
    inputSchema: IngestDocumentInputSchema.extend({
      documentId: z.string(),
      fileHash: z.string(),
    }),
    observability: options.observability,
  })
    .step({
      id: 'store',
      run: async ({ input }) => {
        await mkdir(options.storageDir, { recursive: true })
        const storedPath = join(options.storageDir, `${input.documentId}.pdf`)
        await copyFile(input.path, storedPath)

        return { ...input, storageUri: pathToFileURL(storedPath).href }
      },
    })
    .step({
      id: 'extract',
      run: ({ input }) =>
        removeStoredPdfOnError(input.storageUri, async () => ({
          ...input,
          pages: await extractPages(await readFile(fileURLToPath(input.storageUri))),
        })),
    })
    .step({
      id: 'chunk',
      run: ({ input }) =>
        removeStoredPdfOnError(input.storageUri, () => ({
          ...input,
          passages: chunkPages(input.title, input.pages),
        })),
    })
    .step({
      id: 'save',
      run: ({ input }) =>
        removeStoredPdfOnError(input.storageUri, async () => {
          await options.library.saveDocument({
            document: {
              id: input.documentId,
              analystId: options.analystId,
              title: input.title,
              type: input.type,
              number: input.number,
              year: input.year,
              area: input.area,
              status: input.status,
              confirmed: true,
              fileHash: input.fileHash,
              storageUri: input.storageUri,
              pageCount: input.pages.length,
            },
            pages: input.pages.map((page) => ({
              documentId: input.documentId,
              page: page.page,
              text: page.text,
              ocr: page.ocr,
            })),
            passages: input.passages.map((passage) => ({
              ...passage,
              id: passageId(input.documentId, passage.index),
              documentId: input.documentId,
            })),
          })

          return input
        }),
    })
    .step({
      id: 'index',
      run: async ({ input, abortSignal }): Promise<IngestDocumentResult> => {
        if (input.passages.length > 0) {
          await ingestVectorDocuments({
            documents: input.passages.map((passage) => {
              const metadata: PassageMetadata = {
                analystId: options.analystId,
                documentId: input.documentId,
                confirmed: true,
                status: input.status,
                title: input.title,
                type: input.type,
                heading: passage.heading,
                pageStart: passage.pageStart,
                pageEnd: passage.pageEnd,
              }

              if (input.number !== null) metadata.number = input.number

              if (input.year !== null) metadata.year = input.year

              return {
                id: passageId(input.documentId, passage.index),
                text: `${passage.heading}\n${passage.text}`,
                metadata,
              }
            }),
            store: await ensurePassageStore(options.collectionName),
            model: options.embeddingModel ?? getEmbeddingModel(),
            concurrency: PASSAGE_INDEX_CONCURRENCY,
            abortSignal,
          })
        }

        await options.library.markIndexed(input.documentId)

        return {
          documentId: input.documentId,
          skipped: false,
          pageCount: input.pages.length,
          ocrPages: input.pages.filter((page) => page.ocr).map((page) => page.page),
          passageCount: input.passages.length,
        }
      },
    })
}
