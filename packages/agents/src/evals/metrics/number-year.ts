import {
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  EvalOutcome,
} from '@anvia/core/evals'
import type { DocumentsResult } from '../../types'
import { documentResult, foundFixture } from '../fixtures'
import { types } from '../types'

// The spec for a number and year, kept apart from source-map.ts. The first "number year" pair in
// the title names the document; when the title has none, the decoded URL path is the fallback.
const NUMBER_YEAR = /\b(\d+) (?:tahun |th )?(\d{4})\b/

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function pathOf(sourceUrl: string) {
  try {
    return decodeURIComponent(new URL(sourceUrl).pathname)
  } catch {
    return ''
  }
}

function numberYearIn(text: string) {
  const match = NUMBER_YEAR.exec(normalise(text))

  if (!match) return null

  return { number: match[1], year: Number(match[2]) }
}

function expectedNumberYear(title: string, sourceUrl: string) {
  return numberYearIn(title) ?? numberYearIn(pathOf(sourceUrl)) ?? { number: null, year: null }
}

const numberYear = types.defineMetric({
  name: 'number-year',
  dataType: 'BOOLEAN',
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

const controlCases = defineEvalCases([
  { id: 'uu-number-from-title', input: 'uu-number-from-title', expected: { status: 'found' } },
  { id: 'uu-number-from-excerpt', input: 'uu-number-from-excerpt', expected: { status: 'found' } },
  { id: 'uu-number-missing', input: 'uu-number-missing', expected: { status: 'found' } },
  { id: 'uu-year-wrong', input: 'uu-year-wrong', expected: { status: 'found' } },
  { id: 'perda-number-from-url', input: 'perda-number-from-url', expected: { status: 'found' } },
  {
    id: 'download-without-number',
    input: 'download-without-number',
    expected: { status: 'found' },
  },
])

const UU_TITLE = 'UU No. 28 Tahun 2002 tentang Bangunan Gedung'
const UU_URL = 'https://peraturan.go.id/id/uu-no-28-tahun-2002'
const PERDA_URL =
  'https://peraturan.bpk.go.id/Download/76536/PERDA%203-2017%20PENJELASAN%20BANGUNAN%20GEDUNG.pdf'
const DOWNLOAD_TITLE = 'WALI KOTA SURABAYA PROVINSI JAWA TIMUR'
const DOWNLOAD_URL = 'https://jdih.surabaya.go.id/peraturan/download/4576'
const EXCERPT_13 = 'Mencabut Peraturan Walikota Nomor 13 Tahun 2018'

const fixtures: Record<string, DocumentsResult> = {
  'uu-number-from-title': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: UU_URL,
        level: 'national',
        number: '28',
        year: 2002,
      }),
    ],
  }),
  'uu-number-from-excerpt': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: UU_URL,
        level: 'national',
        excerpt: EXCERPT_13,
        number: '13',
        year: 2018,
      }),
    ],
  }),
  'uu-number-missing': foundFixture({
    national: [
      documentResult({ title: UU_TITLE, docType: 'UU', sourceUrl: UU_URL, level: 'national' }),
    ],
  }),
  'uu-year-wrong': foundFixture({
    national: [
      documentResult({
        title: UU_TITLE,
        docType: 'UU',
        sourceUrl: UU_URL,
        level: 'national',
        number: '28',
        year: 2018,
      }),
    ],
  }),
  'perda-number-from-url': foundFixture({
    city: [
      documentResult({
        title: 'Penjelasan Bangunan Gedung',
        docType: 'Other',
        sourceUrl: PERDA_URL,
        level: 'city',
        number: '3',
        year: 2017,
      }),
    ],
  }),
  'download-without-number': foundFixture({
    city: [
      documentResult({
        title: DOWNLOAD_TITLE,
        docType: 'Other',
        sourceUrl: DOWNLOAD_URL,
        level: 'city',
      }),
    ],
  }),
}

export const numberYearControl = defineEvalSuite({
  name: 'number-year-control',
  cases: controlCases,
  target: (_input, testCase) => fixtures[testCase.id],
  metrics: [numberYear],
})

export const numberYearControlExpectations = defineEvalExpectations(numberYearControl, {
  outcomes: {
    'uu-number-from-title': { 'number-year': 'pass' },
    'uu-number-from-excerpt': { 'number-year': 'fail' },
    'uu-number-missing': { 'number-year': 'fail' },
    'uu-year-wrong': { 'number-year': 'fail' },
    'perda-number-from-url': { 'number-year': 'pass' },
    'download-without-number': { 'number-year': 'pass' },
  },
})

export { numberYear }
