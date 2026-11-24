import { EvalOutcome } from '@anvia/core/evals'
import type { DocumentResult } from '../../types'
import { evalTypes } from '../types'

// The spec for a duplicate. It copies the merge rule rather than importing it, so the metric checks
// the output and not the code. Two results at one level with the same type, number and year are one
// document. A result without a type, number or year is never a duplicate.
function duplicateKeyOf(result: DocumentResult) {
  if (result.docType === 'Other' || result.number === null || result.year === null) return null

  const number = result.number.toLowerCase()

  return [result.jurisdictionLevel, result.docType, number, result.year].join('|')
}

export const merge = evalTypes.defineMetric({
  name: 'merge',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const seen = new Set<string>()
    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      const key = duplicateKeyOf(result)

      if (key === null) continue

      if (seen.has(key)) problems.push(`"${result.title}" appears more than once`)

      seen.add(key)
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})
