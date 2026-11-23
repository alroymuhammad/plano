import { runEvalCli } from '@anvia/core/evals'
import { findDocumentsSuite } from './suite'

const caseIds = process.argv.slice(2)

await runEvalCli({
  ...findDocumentsSuite,
  exitCode: true,
  caseIds: caseIds.length > 0 ? caseIds : undefined,
})
