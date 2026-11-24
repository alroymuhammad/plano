import { EvalOutcome } from '@anvia/core/evals'
import type { IdentifiedDocumentResult } from '../types'
import { evalTypes } from '../types'

// Only digit runs count, so "No.", "Nomor" and "Tahun" are ignored. Leading zeros are dropped, so "03" matches "3".
const digitRunsOf = (text: string) =>
  (text.match(/\d+/g) ?? []).map((run) => run.replace(/^0+(?=\d)/, ''))

// Decoded before its digits are read, so an escape such as "%20" adds no digits.
const decodedUrl = (url: string) => {
  try {
    return decodeURIComponent(url)
  } catch {
    return url
  }
}

// Each number or year that a result sets must appear in its excerpt or source URL.
// A blank field is unset and passes. The title is not checked.
const setValuesShown = (result: IdentifiedDocumentResult) => {
  const shown = new Set(digitRunsOf(`${result.excerpt} ${decodedUrl(result.sourceUrl)}`))
  const values = [result.number, result.year].filter(
    (value): value is string => value !== undefined && value.trim() !== '',
  )

  return values.every((value) => {
    const runs = digitRunsOf(value)

    return runs.length > 0 && runs.every((run) => shown.has(run))
  })
}

export const numberAndYear = evalTypes.defineMetric({
  name: 'number-and-year',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const unshown = Object.values(output.levels)
      .flat()
      .some((result) => !setValuesShown(result))

    return unshown ? EvalOutcome.fail(false) : EvalOutcome.pass(true)
  },
})
