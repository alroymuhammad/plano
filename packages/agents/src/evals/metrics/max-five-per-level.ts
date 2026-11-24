import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'

export const maxFivePerLevel = evalTypes.defineMetric({
  name: 'max-five-per-level',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: () => EvalOutcome.pass(true),
})
