import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'

// Each level shows at most five results. A level with more means the cap was not applied.
export const maxFivePerLevel = evalTypes.defineMetric({
  name: 'max-five-per-level',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const overflowing = Object.values(output.levels).some((results) => results.length > 5)

    return overflowing ? EvalOutcome.fail(false) : EvalOutcome.pass(true)
  },
})
