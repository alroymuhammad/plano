import { EvalOutcome } from '@anvia/core/evals'
import type { DocumentResult } from '../../types'
import { documentIdentity } from '../document-identity'
import { evalTypes } from '../types'

// True when a non-official copy ranks above an official copy of the same document.
const unofficialAboveOfficial = (results: DocumentResult[]) => {
  const unofficial = new Set<string>()

  for (const result of results) {
    const identity = documentIdentity(result.title)

    if (!identity) continue

    if (result.credibility === 'official' && unofficial.has(identity)) return true

    if (result.credibility !== 'official') unofficial.add(identity)
  }

  return false
}

export const officialAboveUnofficial = evalTypes.defineMetric({
  name: 'official-above-unofficial',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const misranked = Object.values(output.levels).some(unofficialAboveOfficial)

    return misranked ? EvalOutcome.fail(false) : EvalOutcome.pass(true)
  },
})
