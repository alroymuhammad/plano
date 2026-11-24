import {
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  EvalOutcome,
} from '@anvia/core/evals'
import type { DocumentsResult } from '../../types'
import { documentResult, foundFixture } from '../fixtures'
import { types } from '../types'
import { expectedLevel } from './level'

const region = types.defineMetric({
  name: 'region',
  dataType: 'BOOLEAN',
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      const expected = expectedLevel(result.title, result.sourceUrl)

      if (expected === null)
        problems.push(
          `"${result.title}" names neither Kota Surabaya nor Provinsi Jawa Timur and should be dropped`,
        )
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

const UU_TITLE = 'UU No. 28 Tahun 2002 tentang Bangunan Gedung'
const UU_URL = 'https://peraturan.go.id/id/uu-no-28-tahun-2002'
const KOTA_TITLE = 'Peraturan Daerah Kota Surabaya Nomor 7 Tahun 2010 tentang Bangunan Gedung'
const KOTA_URL = 'https://peraturan.bpk.go.id/Download/50123/PERDA%20KOTA%20SURABAYA%207%202010.pdf'

const controlCases = defineEvalCases([
  { id: 'uu-kept', input: 'uu-kept', expected: { status: 'found' } },
  { id: 'kota-surabaya-kept', input: 'kota-surabaya-kept', expected: { status: 'found' } },
  {
    id: 'leftmost-surabaya-kept',
    input: 'leftmost-surabaya-kept',
    expected: { status: 'found' },
  },
  { id: 'kabupaten-dropped', input: 'kabupaten-dropped', expected: { status: 'found' } },
  {
    id: 'provinsi-barat-dropped',
    input: 'provinsi-barat-dropped',
    expected: { status: 'found' },
  },
  {
    id: 'leftmost-other-region-dropped',
    input: 'leftmost-other-region-dropped',
    expected: { status: 'found' },
  },
  {
    id: 'path-other-region-dropped',
    input: 'path-other-region-dropped',
    expected: { status: 'found' },
  },
  { id: 'no-region-dropped', input: 'no-region-dropped', expected: { status: 'found' } },
])

const fixtures: Record<string, DocumentsResult> = {
  'uu-kept': foundFixture({
    national: [
      documentResult({ title: UU_TITLE, docType: 'UU', sourceUrl: UU_URL, level: 'national' }),
    ],
  }),
  'kota-surabaya-kept': foundFixture({
    city: [
      documentResult({ title: KOTA_TITLE, docType: 'Perda', sourceUrl: KOTA_URL, level: 'city' }),
    ],
  }),
  'leftmost-surabaya-kept': foundFixture({
    city: [
      documentResult({
        title: 'WALI KOTA SURABAYA PROVINSI JAWA TIMUR',
        docType: 'Other',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/4576',
        level: 'city',
      }),
    ],
  }),
  'kabupaten-dropped': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Daerah Kabupaten Sidoarjo Nomor 2 Tahun 2019 tentang Bangunan Gedung',
        docType: 'Perda',
        sourceUrl:
          'https://peraturan.bpk.go.id/Download/50125/PERDA%20KABUPATEN%20SIDOARJO%202%202019.pdf',
        level: 'city',
      }),
    ],
  }),
  'provinsi-barat-dropped': foundFixture({
    province: [
      documentResult({
        title: 'Peraturan Daerah Provinsi Jawa Barat Nomor 1 Tahun 2020 tentang Bangunan Gedung',
        docType: 'Perda',
        sourceUrl:
          'https://peraturan.bpk.go.id/Download/50126/PERDA%20PROVINSI%20JAWA%20BARAT%201%202020.pdf',
        level: 'province',
      }),
    ],
  }),
  'leftmost-other-region-dropped': foundFixture({
    province: [
      documentResult({
        title: 'Peraturan Daerah Kabupaten Malang tentang Kerja Sama dengan Provinsi Jawa Timur',
        docType: 'Perda',
        sourceUrl: 'https://peraturan.bpk.go.id/Download/50127/PERDA%20KABUPATEN%20MALANG.pdf',
        level: 'province',
      }),
    ],
  }),
  'path-other-region-dropped': foundFixture({
    city: [
      documentResult({
        title: 'PERATURAN DAERAH',
        docType: 'Perda',
        sourceUrl:
          'https://peraturan.bpk.go.id/Download/50128/PERDA%20KABUPATEN%20SIDOARJO%202010.pdf',
        level: 'city',
      }),
    ],
  }),
  'no-region-dropped': foundFixture({
    national: [
      documentResult({
        title: 'PERDA 3-2017 PENJELASAN BANGUNAN GEDUNG.pdf',
        docType: 'Perda',
        sourceUrl:
          'https://peraturan.bpk.go.id/Download/76536/PERDA%203-2017%20PENJELASAN%20BANGUNAN%20GEDUNG.pdf',
        level: 'national',
      }),
    ],
  }),
}

export const regionControl = defineEvalSuite({
  name: 'region-control',
  cases: controlCases,
  target: (_input, testCase) => fixtures[testCase.id],
  metrics: [region],
})

export const regionControlExpectations = defineEvalExpectations(regionControl, {
  outcomes: {
    'uu-kept': { region: 'pass' },
    'kota-surabaya-kept': { region: 'pass' },
    'leftmost-surabaya-kept': { region: 'pass' },
    'kabupaten-dropped': { region: 'fail' },
    'provinsi-barat-dropped': { region: 'fail' },
    'leftmost-other-region-dropped': { region: 'fail' },
    'path-other-region-dropped': { region: 'fail' },
    'no-region-dropped': { region: 'fail' },
  },
})

export { region }
