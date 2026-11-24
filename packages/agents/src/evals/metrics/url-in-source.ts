import { EvalOutcome } from '@anvia/core/evals'
import type { DocumentResult } from '../../types'
import type { FindDocumentsEvalOutput } from '../types'
import { evalTypes } from '../types'

// A result's URL is traced when its excerpt names the URL, or the search for its
// level returned it. Any other URL is one the run cannot account for.
const urlTraced = (result: DocumentResult, searched: FindDocumentsEvalOutput['searched']) =>
  result.excerpt.includes(result.sourceUrl) ||
  (searched[result.jurisdictionLevel] ?? []).includes(result.sourceUrl)

export const urlInSource = evalTypes.defineMetric({
  name: 'url-in-source',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const untraced = Object.values(output.levels)
      .flat()
      .some((result) => !urlTraced(result, output.searched))

    return untraced ? EvalOutcome.fail(false) : EvalOutcome.pass(true)
  },
})
