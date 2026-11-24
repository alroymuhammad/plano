import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'

export const outOfScopeRejected = evalTypes.defineMetric({
  name: 'out-of-scope-rejected',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ case: testCase, output }) => {
    if (testCase.expected?.status !== 'out_of_scope') return EvalOutcome.pass(true)

    return output.status === 'out_of_scope' ? EvalOutcome.pass(true) : EvalOutcome.fail(false)
  },
})
