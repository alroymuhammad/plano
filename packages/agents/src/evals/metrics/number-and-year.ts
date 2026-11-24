import { EvalOutcome } from '@anvia/core/evals'
import type { DocumentResult } from '../../types'
import { numberAndYearOf } from '../document-identity'
import { evalTypes } from '../types'

// The title must name its number and year, and the excerpt or source URL must
// repeat both as whole digit tokens. Otherwise a reader cannot tell which regulation it is.
const numberAndYearShown = (result: DocumentResult) => {
  const numbered = numberAndYearOf(result.title)

  if (!numbered) return false

  const text = `${result.excerpt} ${result.sourceUrl}`
  const shown = (digits: string) => new RegExp(`(?<!\\d)${digits}(?!\\d)`).test(text)

  return shown(numbered.number) && shown(numbered.year)
}

export const numberAndYear = evalTypes.defineMetric({
  name: 'number-and-year',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const unshown = Object.values(output.levels)
      .flat()
      .some((result) => !numberAndYearShown(result))

    return unshown ? EvalOutcome.fail(false) : EvalOutcome.pass(true)
  },
})
