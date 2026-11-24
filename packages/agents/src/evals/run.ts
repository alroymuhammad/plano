import { runEvalCli } from '@anvia/core/evals'
import { createLens } from '@plano/observability'
import { findDocuments } from '../index'
import { findDocumentsSuite } from './suite'

const caseIds = process.argv.slice(2)
const { client, pipelineObservability } = createLens()

try {
  await runEvalCli({
    ...findDocumentsSuite,
    target: (input) => findDocuments(input, { observability: pipelineObservability }),
    exitCode: true,
    caseIds: caseIds.length > 0 ? caseIds : undefined,
  })
} finally {
  await client.close()
}
