import { EvalOutcome } from '@anvia/core/evals'
import type { DocumentResult } from '../../types'
import type { FindDocumentsEvalOutput } from '../types'
import { evalTypes } from '../types'

type Searched = FindDocumentsEvalOutput['searched']

// A source URL is traced when its excerpt names it or its own level's search returned it.
// An official or download URL is traced when its excerpt names it or any level's search
// returned it, since a merged copy can carry a URL from another level. Any other URL is
// one the run cannot account for.
const sourceTraced = (result: DocumentResult, searched: Searched) =>
  result.excerpt.includes(result.sourceUrl) ||
  (searched[result.jurisdictionLevel] ?? []).includes(result.sourceUrl)

const anyLevelTraced = (result: DocumentResult, url: string, searched: Searched) =>
  result.excerpt.includes(url) || Object.values(searched).some((urls) => urls?.includes(url))

const resultTraced = (result: DocumentResult, searched: Searched) =>
  sourceTraced(result, searched) &&
  [result.officialUrl, result.downloadUrl].every(
    (url) => url === undefined || anyLevelTraced(result, url, searched),
  )

export const urlInSource = evalTypes.defineMetric({
  name: 'url-in-source',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const untraced = Object.values(output.levels)
      .flat()
      .some((result) => !resultTraced(result, output.searched))

    return untraced ? EvalOutcome.fail(false) : EvalOutcome.pass(true)
  },
})
