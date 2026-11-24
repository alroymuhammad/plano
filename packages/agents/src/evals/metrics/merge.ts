import {
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  EvalOutcome,
} from '@anvia/core/evals'
import type { DocumentResult, DocumentsResult } from '../../types'
import { documentResult, foundFixture } from '../fixtures'
import { types } from '../types'

// The spec for a duplicate. It copies the merge rule rather than importing it, so the metric checks
// the output and not the code. Two results at one level with the same type, number and year are one
// document. A result without a type, number or year is never a duplicate.
function duplicateKeyOf(result: DocumentResult) {
  if (result.docType === 'Other' || result.number === null || result.year === null) return null

  const number = result.number.toLowerCase()

  return [result.jurisdictionLevel, result.docType, number, result.year].join('|')
}

const merge = types.defineMetric({
  name: 'merge',
  dataType: 'BOOLEAN',
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const seen = new Set<string>()
    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      const key = duplicateKeyOf(result)

      if (key === null) continue

      if (seen.has(key)) problems.push(`"${result.title}" appears more than once`)

      seen.add(key)
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

const controlCases = defineEvalCases([
  { id: 'same-document-twice', input: 'same-document-twice', expected: { status: 'found' } },
  { id: 'different-documents', input: 'different-documents', expected: { status: 'found' } },
])

const fixtures: Record<string, DocumentsResult> = {
  'same-document-twice': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya Nomor 118 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/4301',
        level: 'city',
        number: '118',
        year: 2023,
      }),
      documentResult({
        title: 'Peraturan Walikota Surabaya No. 118 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://example.com/perwali-118-2023',
        level: 'city',
        credibility: 'open_web',
        number: '118',
        year: 2023,
      }),
    ],
  }),
  'different-documents': foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya Nomor 118 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/4301',
        level: 'city',
        number: '118',
        year: 2023,
      }),
      documentResult({
        title: 'Peraturan Wali Kota Surabaya Nomor 33 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl: 'https://jdih.surabaya.go.id/peraturan/4302',
        level: 'city',
        number: '33',
        year: 2023,
      }),
    ],
  }),
}

export const mergeControl = defineEvalSuite({
  name: 'merge-control',
  cases: controlCases,
  target: (_input, testCase) => fixtures[testCase.id],
  metrics: [merge],
})

export const mergeControlExpectations = defineEvalExpectations(mergeControl, {
  outcomes: {
    'same-document-twice': { merge: 'fail' },
    'different-documents': { merge: 'pass' },
  },
})

export { merge }
