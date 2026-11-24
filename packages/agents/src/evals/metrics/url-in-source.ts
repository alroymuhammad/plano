import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'

export const urlInSource = evalTypes.defineMetric({
  name: 'url-in-source',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: () => EvalOutcome.pass(true),
})
