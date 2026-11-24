import {
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  EvalOutcome,
} from '@anvia/core/evals'
import type { DocumentsResult } from '../../types'
import { documentResult, foundFixture } from '../fixtures'
import { types } from '../types'

// The literal spec table, kept apart from source-map.ts: a title that starts with one of these phrases names that type.
const LEADING_PHRASES: ReadonlyArray<readonly [string, string]> = [
  ['undang undang', 'UU'],
  ['uu', 'UU'],
  ['peraturan pemerintah', 'PP'],
  ['pp', 'PP'],
  ['peraturan presiden', 'Perpres'],
  ['perpres', 'Perpres'],
  ['peraturan menteri', 'Permen'],
  ['permen', 'Permen'],
  ['peraturan daerah', 'Perda'],
  ['perda', 'Perda'],
  ['peraturan wali kota', 'Perwali'],
  ['peraturan walikota', 'Perwali'],
  ['perwali', 'Perwali'],
  ['peraturan gubernur', 'Pergub'],
  ['pergub', 'Pergub'],
]

function normalise(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function expectedDocType(title: string) {
  const words = normalise(title)
  const match = LEADING_PHRASES.find(
    ([phrase]) => words === phrase || words.startsWith(`${phrase} `),
  )

  return match?.[1]
}

const docType = types.defineMetric({
  name: 'doc-type',
  dataType: 'BOOLEAN',
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const results = Object.values(output.levels).flat()
    const typed = results.filter((result) => result.docType !== 'Other')
    const problems: string[] = []

    for (const result of results) {
      const expected = expectedDocType(result.title)

      if (expected && result.docType !== expected)
        problems.push(`"${result.title}" should be ${expected}, got ${result.docType}`)
    }

    if (typed.length * 2 < results.length)
      problems.push(`only ${typed.length} of ${results.length} results have a document type`)

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

const controlCases = defineEvalCases([
  { id: 'perda-typed-as-other', input: 'perda-typed-as-other', expected: { status: 'found' } },
  { id: 'perda-typed-as-perda', input: 'perda-typed-as-perda', expected: { status: 'found' } },
  {
    id: 'perwali-typed-as-pergub',
    input: 'perwali-typed-as-pergub',
    expected: { status: 'found' },
  },
  { id: 'uu-typed-as-other', input: 'uu-typed-as-other', expected: { status: 'found' } },
  { id: 'mostly-other', input: 'mostly-other', expected: { status: 'found' } },
  { id: 'mostly-typed', input: 'mostly-typed', expected: { status: 'found' } },
])

const PERDA_TITLE = 'PERDA 3-2017 PENJELASAN BANGUNAN GEDUNG.pdf'
const PERDA_URL =
  'https://peraturan.bpk.go.id/Download/76536/PERDA%203-2017%20PENJELASAN%20BANGUNAN%20GEDUNG.pdf'
const UU_TITLE = 'UU No. 28 Tahun 2002 tentang Bangunan Gedung'
const UU_URL = 'https://peraturan.go.id/id/uu-no-28-tahun-2002'
const PERWALI_TITLE = 'Peraturan Walikota PERWALI Nomor 89 Tahun 2024 tentang Pedoman Teknis'
const PERWALI_URL = 'https://jdih.surabaya.go.id/peraturan/4576'
const DOWNLOAD_TITLE = 'WALI KOTA SURABAYA PROVINSI JAWA TIMUR'
const DOWNLOAD_URL = 'https://jdih.surabaya.go.id/peraturan/download/4576'

const fixtures: Record<string, DocumentsResult> = {
  'perda-typed-as-other': foundFixture({
    city: [
      documentResult({ title: PERDA_TITLE, docType: 'Other', sourceUrl: PERDA_URL, level: 'city' }),
    ],
  }),
  'perda-typed-as-perda': foundFixture({
    city: [
      documentResult({ title: PERDA_TITLE, docType: 'Perda', sourceUrl: PERDA_URL, level: 'city' }),
    ],
  }),
  'perwali-typed-as-pergub': foundFixture({
    city: [
      documentResult({
        title: PERWALI_TITLE,
        docType: 'Pergub',
        sourceUrl: PERWALI_URL,
        level: 'city',
      }),
    ],
  }),
  'uu-typed-as-other': foundFixture({
    national: [
      documentResult({ title: UU_TITLE, docType: 'Other', sourceUrl: UU_URL, level: 'national' }),
    ],
    city: [
      documentResult({
        title: PERWALI_TITLE,
        docType: 'Perwali',
        sourceUrl: PERWALI_URL,
        level: 'city',
      }),
    ],
  }),
  'mostly-other': foundFixture({
    city: [
      documentResult({
        title: DOWNLOAD_TITLE,
        docType: 'Other',
        sourceUrl: DOWNLOAD_URL,
        level: 'city',
      }),
      documentResult({
        title: 'Keputusan Sekretaris Daerah Provinsi Jawa Timur selaku pengelola barang',
        docType: 'Other',
        sourceUrl: 'https://jdih.jatimprov.go.id/peraturan/keputusan-sekretaris-daerah/contoh',
        level: 'city',
      }),
      documentResult({
        title: PERWALI_TITLE,
        docType: 'Perwali',
        sourceUrl: PERWALI_URL,
        level: 'city',
      }),
    ],
  }),
  'mostly-typed': foundFixture({
    national: [
      documentResult({ title: UU_TITLE, docType: 'UU', sourceUrl: UU_URL, level: 'national' }),
    ],
    city: [
      documentResult({
        title: PERWALI_TITLE,
        docType: 'Perwali',
        sourceUrl: PERWALI_URL,
        level: 'city',
      }),
      documentResult({
        title: DOWNLOAD_TITLE,
        docType: 'Other',
        sourceUrl: DOWNLOAD_URL,
        level: 'city',
      }),
    ],
  }),
}

export const docTypeControl = defineEvalSuite({
  name: 'doc-type-control',
  cases: controlCases,
  target: (_input, testCase) => fixtures[testCase.id],
  metrics: [docType],
})

export const docTypeControlExpectations = defineEvalExpectations(docTypeControl, {
  outcomes: {
    'perda-typed-as-other': { 'doc-type': 'fail' },
    'perda-typed-as-perda': { 'doc-type': 'pass' },
    'perwali-typed-as-pergub': { 'doc-type': 'fail' },
    'uu-typed-as-other': { 'doc-type': 'fail' },
    'mostly-other': { 'doc-type': 'fail' },
    'mostly-typed': { 'doc-type': 'pass' },
  },
})

export { docType }
