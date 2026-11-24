import {
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  EvalOutcome,
} from '@anvia/core/evals'
import type { DocumentsResult, JurisdictionLevel } from '../../types'
import { documentResult, foundFixture } from '../fixtures'
import { types } from '../types'

// The spec for a level, kept apart from source-map.ts. A national type (UU, PP, Perpres, Permen) is
// national. Otherwise the first region phrase in the title decides, then the decoded URL path.
// Kota Surabaya is city and Provinsi Jawa Timur is province. Any other region, or none, has no level.
const NATIONAL_TYPES = [
  /^(undang undang|uu)\b/,
  /^(peraturan pemerintah|pp)\b/,
  /^(peraturan presiden|perpres)\b/,
  /^(peraturan menteri|permen)\b/,
]
const REGION =
  /\b(?:((?:wali ?kota|kota) surabaya)|((?:provinsi|propinsi|gubernur) jawa timur)|kabupaten|kota|provinsi|propinsi)\b/

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

function regionIn(text: string): JurisdictionLevel | 'other' | null {
  const match = REGION.exec(normalise(text))

  if (!match) return null

  if (match[1]) return 'city'

  if (match[2]) return 'province'

  return 'other'
}

export function expectedLevel(title: string, sourceUrl: string): JurisdictionLevel | null {
  const normalised = normalise(title)

  if (NATIONAL_TYPES.some((pattern) => pattern.test(normalised))) return 'national'

  const region = regionIn(title) ?? regionIn(pathOf(sourceUrl))

  if (region === 'city' || region === 'province') return region

  return null
}

const level = types.defineMetric({
  name: 'level',
  dataType: 'BOOLEAN',
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const [bucket, results] of Object.entries(output.levels)) {
      for (const result of results) {
        const expected = expectedLevel(result.title, result.sourceUrl)

        // A result with no level is a region problem, which the region metric reports.
        if (expected !== null && expected !== bucket)
          problems.push(`"${result.title}" should be ${expected} but is under ${bucket}`)
      }
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

const UU_TITLE = 'UU No. 28 Tahun 2002 tentang Bangunan Gedung'
const UU_URL = 'https://peraturan.go.id/id/uu-no-28-tahun-2002'
const KOTA_TITLE = 'Peraturan Daerah Kota Surabaya Nomor 7 Tahun 2010 tentang Bangunan Gedung'
const KOTA_URL = 'https://peraturan.bpk.go.id/Download/50123/PERDA%20KOTA%20SURABAYA%207%202010.pdf'
const PROVINSI_TITLE = 'Peraturan Daerah Provinsi Jawa Timur Nomor 2 Tahun 2014 tentang Retribusi'
const PROVINSI_URL =
  'https://peraturan.bpk.go.id/Download/50124/PERDA%20PROVINSI%20JAWA%20TIMUR%202%202014.pdf'
const JATIM_URL =
  'https://jdih.jatimprov.go.id/peraturan/peraturan-gubernur/sewa-tanah-dan-bangunan-gedung-milik-propinsi-jawa-timur'
const NO_REGION_TITLE = 'PERDA 3-2017 PENJELASAN BANGUNAN GEDUNG.pdf'
const NO_REGION_URL =
  'https://peraturan.bpk.go.id/Download/76536/PERDA%203-2017%20PENJELASAN%20BANGUNAN%20GEDUNG.pdf'

const controlCases = defineEvalCases([
  {
    id: 'national-type-in-national',
    input: 'national-type-in-national',
    expected: { status: 'found' },
  },
  {
    id: 'kota-surabaya-in-national',
    input: 'kota-surabaya-in-national',
    expected: { status: 'found' },
  },
  { id: 'kota-surabaya-in-city', input: 'kota-surabaya-in-city', expected: { status: 'found' } },
  { id: 'provinsi-in-city', input: 'provinsi-in-city', expected: { status: 'found' } },
  {
    id: 'province-from-url-path',
    input: 'province-from-url-path',
    expected: { status: 'found' },
  },
  { id: 'no-level-skipped', input: 'no-level-skipped', expected: { status: 'found' } },
])

const fixtures: Record<string, DocumentsResult> = {
  'national-type-in-national': foundFixture({
    national: [
      documentResult({ title: UU_TITLE, docType: 'UU', sourceUrl: UU_URL, level: 'national' }),
    ],
  }),
  'kota-surabaya-in-national': foundFixture({
    national: [
      documentResult({
        title: KOTA_TITLE,
        docType: 'Perda',
        sourceUrl: KOTA_URL,
        level: 'national',
      }),
    ],
  }),
  'kota-surabaya-in-city': foundFixture({
    city: [
      documentResult({ title: KOTA_TITLE, docType: 'Perda', sourceUrl: KOTA_URL, level: 'city' }),
    ],
  }),
  'provinsi-in-city': foundFixture({
    city: [
      documentResult({
        title: PROVINSI_TITLE,
        docType: 'Perda',
        sourceUrl: PROVINSI_URL,
        level: 'city',
      }),
    ],
  }),
  'province-from-url-path': foundFixture({
    province: [
      documentResult({
        title: 'SEWA TANAH DAN BANGUNAN GEDUNG ...',
        docType: 'Other',
        sourceUrl: JATIM_URL,
        level: 'province',
      }),
    ],
  }),
  'no-level-skipped': foundFixture({
    national: [
      documentResult({
        title: NO_REGION_TITLE,
        docType: 'Perda',
        sourceUrl: NO_REGION_URL,
        level: 'national',
      }),
    ],
  }),
}

export const levelControl = defineEvalSuite({
  name: 'level-control',
  cases: controlCases,
  target: (_input, testCase) => fixtures[testCase.id],
  metrics: [level],
})

export const levelControlExpectations = defineEvalExpectations(levelControl, {
  outcomes: {
    'national-type-in-national': { level: 'pass' },
    'kota-surabaya-in-national': { level: 'fail' },
    'kota-surabaya-in-city': { level: 'pass' },
    'provinsi-in-city': { level: 'fail' },
    'province-from-url-path': { level: 'pass' },
    'no-level-skipped': { level: 'pass' },
  },
})

export { level }
