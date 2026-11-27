import { createHash, randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { embedDocuments } from '@anvia/core/embeddings'
import { Pipeline } from '@anvia/core/pipeline'
import { z } from 'zod'
import {
  IngestDocumentInputSchema,
  type IngestDocumentOptions,
  type IngestDocumentResult,
  type PassageMetadata,
  type PassageTopic,
} from '../../types'
import { getEmbeddingModel } from '../../utils/embedding'
import { ensurePassageStore } from '../../utils/qdrant'
import { chunkPages } from './chunk'
import { PASSAGE_INDEX_CONCURRENCY } from './constants'
import { enrichPassages, formatPassageEmbeddingText } from './enrich'
import { extractPages } from './extract'

type PassageQdrantMetadata = PassageMetadata & {
  topics: PassageTopic[]
  tags: string[]
}

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
          pages: await extractPages(
            await readFile(fileURLToPath(input.storageUri)),
            options.ocrDataDir,
          ),
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
      id: 'enrich',
      run: ({ input, abortSignal }) =>
        removeStoredPdfOnError(input.storageUri, async () => ({
          ...input,
          passages: await enrichPassages(
            input.passages,
            {
              title: input.title,
              type: input.type,
              area: input.area,
              abortSignal,
            },
            options.enricher,
          ),
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
              id: passageId(input.documentId, passage.index),
              documentId: input.documentId,
              index: passage.index,
              heading: passage.heading,
              text: passage.text,
              pageStart: passage.pageStart,
              pageEnd: passage.pageEnd,
            })),
          })

          return input
        }),
    })
    .step({
      id: 'index',
      run: async ({ input, abortSignal }): Promise<IngestDocumentResult> => {
        if (input.passages.length > 0) {
          const passageDocuments = input.passages.map((passage) => {
            const metadata: PassageQdrantMetadata = {
              analystId: options.analystId,
              documentId: input.documentId,
              confirmed: true,
              status: input.status,
              title: input.title,
              type: input.type,
              heading: passage.heading,
              pageStart: passage.pageStart,
              pageEnd: passage.pageEnd,
              topics: passage.topics,
              tags: passage.tags,
            }

            if (input.number !== null) metadata.number = input.number

            if (input.year !== null) metadata.year = input.year

            return {
              id: passageId(input.documentId, passage.index),
              text: `${passage.heading}\n${passage.text}`,
              metadata: metadata as unknown as PassageMetadata,
            }
          })

          const { documents } = await embedDocuments({
            documents: passageDocuments,
            id: (doc) => doc.id,
            content: (_doc, index) => [formatPassageEmbeddingText(input.passages[index])],
            metadata: (doc) => doc.metadata,
            model: options.embeddingModel ?? getEmbeddingModel(),
            concurrency: PASSAGE_INDEX_CONCURRENCY,
            abortSignal,
          })

          const store = await ensurePassageStore(options.collectionName)
          await store.upsert({ documents })
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
