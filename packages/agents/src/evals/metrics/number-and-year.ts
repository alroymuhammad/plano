import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'

export const numberAndYear = evalTypes.defineMetric({
  name: 'number-and-year',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: () => EvalOutcome.pass(true),
})
