import { EvalOutcome } from '@anvia/core/evals'
import type { DocumentResult } from '../../types'
import { evalTypes } from '../types'

// A listing page is a search or category page, not a document. Its URL carries one of these parts.
const LISTING_PARTS = ['?tahun=', '&page=']

function urlsOf(result: DocumentResult) {
  const urls = [result.sourceUrl, result.officialUrl, result.downloadUrl, ...result.alternateUrls]

  return urls.filter((url): url is string => url !== undefined)
}

export const listingUrls = evalTypes.defineMetric({
  name: 'listing-urls',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      for (const url of urlsOf(result)) {
        if (LISTING_PARTS.some((part) => url.includes(part)))
          problems.push(`${url} is a listing page, not a document`)
      }
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})
