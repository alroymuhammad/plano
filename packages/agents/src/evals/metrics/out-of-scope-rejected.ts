import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'

export const outOfScopeRejected = evalTypes.defineMetric({
  name: 'out-of-scope-rejected',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: () => EvalOutcome.pass(true),
})
