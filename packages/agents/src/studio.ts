import { Studio } from '@anvia/studio'
import { createLens } from '@plano/observability'
import { createFindDocumentsSuite } from './evals/suite'
import { createFindDocumentsPipeline } from './find-documents/pipeline'

const { client, pipelineObservability } = createLens()
const studio = new Studio([createFindDocumentsPipeline({ observability: pipelineObservability })], {
  evals: [
    {
      ...createFindDocumentsSuite({ observability: pipelineObservability }),
      reporters: [client.evalReporter()],
    },
  ],
})

studio.start()
