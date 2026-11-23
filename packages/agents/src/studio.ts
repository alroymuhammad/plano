import { Studio } from '@anvia/studio'
import { createLens } from '@plano/observability'
import { createFindDocumentsPipeline } from './find-documents/pipeline'

const { pipelineObservability } = createLens({ serviceName: 'plano-studio' })
const studio = new Studio([createFindDocumentsPipeline({ observability: pipelineObservability })])

studio.start()
