import {
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  EvalOutcome,
} from '@anvia/core/evals'
import type { DocumentResult, DocumentsResult } from '../../types'
import { documentResult, foundFixture } from '../fixtures'
import { types } from '../types'

// A listing page is a search or category page, not a document. Its URL carries one of these parts.
const LISTING_PARTS = ['?tahun=', '&page=']

function urlsOf(result: DocumentResult) {
  const urls = [result.sourceUrl, result.officialUrl, result.downloadUrl, ...result.alternateUrls]

  return urls.filter((url): url is string => url !== undefined)
}

const listingUrls = types.defineMetric({
  name: 'listing-urls',
  dataType: 'BOOLEAN',
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      for (const url of urlsOf(result)) {
        if (LISTING_PARTS.some((part) => url.includes(part)))
          problems.push(`${url} is a listing page, not a document`)
      }
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

const controlCases = defineEvalCases([
  { id: 'document-kept', input: 'document-kept', expected: { status: 'found' } },
  { id: 'tahun-listing-dropped', input: 'tahun-listing-dropped', expected: { status: 'found' } },
  { id: 'page-listing-dropped', input: 'page-listing-dropped', expected: { status: 'found' } },
  {
    id: 'alternate-listing-dropped',
    input: 'alternate-listing-dropped',
    expected: { status: 'found' },
  },
])

const fixtures: Record<string, DocumentsResult> = {
  'document-kept': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya Nomor 33 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/4301',
        level: 'city',
      }),
    ],
  }),
  'tahun-listing-dropped': foundFixture({
    province: [
      documentResult({
        title: 'Peraturan Daerah Provinsi Jawa Timur',
        docType: 'Perda',
        sourceUrl: 'https://jdih.jatimprov.go.id/peraturan/peraturan-daerah?tahun=2023',
        level: 'province',
      }),
    ],
  }),
  'page-listing-dropped': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan?kategori=perwali&page=2',
        level: 'city',
      }),
    ],
  }),
  'alternate-listing-dropped': foundFixture({
    national: [
      {
        ...documentResult({
          title: 'UU No. 28 Tahun 2002 tentang Bangunan Gedung',
          docType: 'UU',
          sourceUrl: 'https://peraturan.go.id/id/uu-no-28-tahun-2002',
          level: 'national',
        }),
        alternateUrls: ['https://jdihn.go.id/search?tahun=2002'],
      },
    ],
  }),
}

export const listingUrlsControl = defineEvalSuite({
  name: 'listing-urls-control',
  cases: controlCases,
  target: (_input, testCase) => fixtures[testCase.id],
  metrics: [listingUrls],
})

export const listingUrlsControlExpectations = defineEvalExpectations(listingUrlsControl, {
  outcomes: {
    'document-kept': { 'listing-urls': 'pass' },
    'tahun-listing-dropped': { 'listing-urls': 'fail' },
    'page-listing-dropped': { 'listing-urls': 'fail' },
    'alternate-listing-dropped': { 'listing-urls': 'fail' },
  },
})

export { listingUrls }
