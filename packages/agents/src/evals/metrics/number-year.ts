import { EvalOutcome } from '@anvia/core/evals'
import type { DocumentResult } from '../../types'
import { evalTypes } from '../types'

// The spec for a number and year, kept apart from source-map.ts. The title is read first, then the
// decoded URL path, then the excerpt. A typed document's identifier follows its own type phrase, up
// to "tentang". The phrase opens the title or a line of the excerpt, and only region words may come
// between it and "Nomor". An Other document reads its URL path only. A "No." or "Nomor" token names
// the number, kept whole. The year is the one after "Tahun", else the last part of a slashed number.
// Without that token, the first "number year" pair in the URL path is used.
const OWN_PHRASES: Partial<Record<string, RegExp>> = {
  UU: /^[\s|#*>]*(?:undang[\s-]*undang|uu)\b/im,
  PP: /^[\s|#*>]*(?:peraturan\s+pemerintah|pp)\b/im,
  Perpres: /^[\s|#*>]*(?:peraturan\s+presiden|perpres)\b/im,
  Permen: /^[\s|#*>]*(?:peraturan\s+menteri|permen)\b/im,
  Perda: /^[\s|#*>]*(?:peraturan\s+daerah|perda)\b/im,
  Perwali: /^[\s|#*>]*(?:peraturan\s+wali\s?kota|perwali)\b/im,
  Pergub: /^[\s|#*>]*(?:peraturan\s+gubernur|pergub)\b/im,
}
const OWN_IDENTIFIER =
  /^(?:[\s,.:;|*#>-]*\b(?:kota|walikota|wali|surabaya|provinsi|propinsi|jawa|timur|gubernur|perwali|perda|pergub|pupr)\b)*[\s,.:;|*#>-]*\b(?:nomor|no)\b[.:\s-]*(\d+(?:[./]\w+)*)(?:[\s,.-]*tahun[\s-]*(\d{4})\b)?/i
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

function ownIn(docType: string, text: string) {
  const phrase = OWN_PHRASES[docType]?.exec(text)

  if (!phrase) return null

  const after = text.slice(phrase.index + phrase[0].length).split(/\btentang\b/i)[0]
  const identifier = OWN_IDENTIFIER.exec(after)

  if (!identifier) return null

  const number = identifier[1]
  const year = identifier[2] ?? SLASHED_YEAR.exec(number)?.[1]

  if (!year) return null

  return { number, year: Number(year) }
}

function expectedNumberYear(result: DocumentResult) {
  return (
    ownIn(result.docType, result.title) ??
    numberYearIn(pathOf(result.sourceUrl)) ??
    ownIn(result.docType, result.excerpt) ?? { number: null, year: null }
  )
}

export const numberYear = evalTypes.defineMetric({
  name: 'number-year',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      const expected = expectedNumberYear(result)

      if (result.number !== expected.number || result.year !== expected.year)
        problems.push(
          `"${result.title}" should have number ${expected.number ?? 'none'} and year ${expected.year ?? 'none'}, got ${result.number ?? 'none'} and ${result.year ?? 'none'}`,
        )
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})
