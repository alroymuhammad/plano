import { fileURLToPath } from 'node:url'
import { Studio } from '@anvia/studio'
import { createDb, createLibraryStore } from '@plano/db'
import { createLens } from '@plano/observability'
import { createFindDocumentsPipeline } from './workflows/find-documents/pipeline'
import { createIngestDocumentPipeline } from './workflows/ingest-document/pipeline'

// Throwaway wiring until the API and platform exist: one fixed dev Analyst, and the local data folder for PDFs.
const DEV_ANALYST_ID = 'dev-analyst'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('Set DATABASE_URL before starting Studio')

const { pipelineObservability } = createLens()
const library = createLibraryStore(createDb(databaseUrl))
const studio = new Studio([
  createFindDocumentsPipeline({ observability: pipelineObservability }),
  createIngestDocumentPipeline({
    library,
    analystId: DEV_ANALYST_ID,
    storageDir: fileURLToPath(new URL('../data', import.meta.url)),
    observability: pipelineObservability,
  }),
])

studio.start()
