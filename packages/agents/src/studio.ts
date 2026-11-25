import { fileURLToPath } from 'node:url'
import { Agent } from '@anvia/core'
import { Studio } from '@anvia/studio'
import { createDb, createLibraryStore } from '@plano/db'
import { createLens } from '@plano/observability'
import { BASE_INSTRUCTION } from './instruction'
import { createSearchLibraryTool } from './tools/search-library'
import { tools } from './tools/tools'
import { getModel } from './utils/model'
import { createFindDocumentsPipeline } from './workflows/find-documents/pipeline'
import { createIngestDocumentPipeline } from './workflows/ingest-document/pipeline'

// Throwaway wiring until the API and platform exist: one fixed dev Analyst, and the local data folder for PDFs.
const DEV_ANALYST_ID = 'dev-analyst'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('Set DATABASE_URL before starting Studio')

const { observability, pipelineObservability } = createLens()
const library = createLibraryStore(createDb(databaseUrl))
// Chat with the dev Analyst's Library: the default tools plus searchLibrary, replaced when the platform exists.
const chat = new Agent({
  id: 'plano',
  model: getModel(),
  instructions: BASE_INSTRUCTION,
  tools: [...tools, createSearchLibraryTool(DEV_ANALYST_ID)],
  maxTurns: 75,
  observability,
})
const studio = new Studio([
  createFindDocumentsPipeline({ observability: pipelineObservability }),
  createIngestDocumentPipeline({
    library,
    analystId: DEV_ANALYST_ID,
    storageDir: fileURLToPath(new URL('../data', import.meta.url)),
    ocrDataDir: fileURLToPath(new URL('../data/tessdata', import.meta.url)),
    observability: pipelineObservability,
  }),
  chat,
])

studio.start()
