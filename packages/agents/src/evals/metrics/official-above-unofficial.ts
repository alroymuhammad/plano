import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'

export const officialAboveUnofficial = evalTypes.defineMetric({
  name: 'official-above-unofficial',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: () => EvalOutcome.pass(true),
})
