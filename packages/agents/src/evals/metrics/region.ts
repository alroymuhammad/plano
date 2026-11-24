import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'
import { expectedLevel } from './level'

export const region = evalTypes.defineMetric({
  name: 'region',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      const expected = expectedLevel(result.title, result.excerpt, result.sourceUrl)

      if (expected === null)
        problems.push(
          `"${result.title}" names neither Kota Surabaya nor Provinsi Jawa Timur and should be dropped`,
        )
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})
