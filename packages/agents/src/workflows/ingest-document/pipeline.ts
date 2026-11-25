import { createHash, randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Pipeline } from '@anvia/core/pipeline'
import { z } from 'zod'
import {
  IngestDocumentInputSchema,
  type IngestDocumentOptions,
  type IngestDocumentResult,
} from '../../types'
import { chunkPages } from './chunk'
import { extractPages } from './extract'

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
        if (existing) return { documentId: existing.id, skipped: true }

        const { output } = await newDocumentPipeline.run({
          input: { ...file, documentId: randomUUID() },
          abortSignal,
        })

        return output
      },
    })
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
      run: async ({ input }) => ({
        ...input,
        pages: await extractPages(await readFile(fileURLToPath(input.storageUri))),
      }),
    })
    .step({
      id: 'chunk',
      run: ({ input }) => ({ ...input, passages: chunkPages(input.title, input.pages) }),
    })
    .step({
      id: 'save',
      run: async ({ input }): Promise<IngestDocumentResult> => {
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
            id: `${input.documentId}:${passage.index}`,
            documentId: input.documentId,
          })),
        })

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
