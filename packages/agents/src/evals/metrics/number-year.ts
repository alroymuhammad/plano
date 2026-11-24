import { EvalOutcome } from '@anvia/core/evals'
import { evalTypes } from '../types'

// The spec for a number and year, kept apart from source-map.ts. A "No." or "Nomor" token names the
// number, kept whole. The year is the one after "Tahun", else the last part of a slashed number.
// Without that token, the first "number year" pair is used. The title is read first, then the path.
const NUMBER_AFTER_NO = /\b(?:nomor|no)\b[.:\s-]*(\d+(?:[./]\w+)*)/i
const YEAR_AFTER_TAHUN = /\btahun[\s-]*(\d{4})\b/i
const SLASHED_YEAR = /\/(\d{4})$/
const PLAIN_PAIR = /(?<![\w/.])(\d+)[\s-]+(?:tahun[\s-]+)?(\d{4})\b/i

function pathOf(sourceUrl: string) {
  try {
    return decodeURIComponent(new URL(sourceUrl).pathname)
  } catch {
    return ''
  }
}

function anchoredIn(text: string, number: string) {
  const year = YEAR_AFTER_TAHUN.exec(text)?.[1] ?? SLASHED_YEAR.exec(number)?.[1]

  if (!year) return null

  return { number, year: Number(year) }
}

function numberYearIn(text: string) {
  const anchored = NUMBER_AFTER_NO.exec(text)

  if (anchored) return anchoredIn(text, anchored[1])

  const pair = PLAIN_PAIR.exec(text)

  if (!pair) return null

  return { number: pair[1], year: Number(pair[2]) }
}

function expectedNumberYear(title: string, sourceUrl: string) {
  return numberYearIn(title) ?? numberYearIn(pathOf(sourceUrl)) ?? { number: null, year: null }
}

export const numberYear = evalTypes.defineMetric({
  name: 'number-year',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      const expected = expectedNumberYear(result.title, result.sourceUrl)

      if (result.number !== expected.number || result.year !== expected.year)
        problems.push(
          `"${result.title}" should have number ${expected.number ?? 'none'} and year ${expected.year ?? 'none'}, got ${result.number ?? 'none'} and ${result.year ?? 'none'}`,
        )
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})
