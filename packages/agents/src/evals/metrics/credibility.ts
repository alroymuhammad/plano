import {
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  EvalOutcome,
} from '@anvia/core/evals'
import type { DocumentsResult, SourceCredibility } from '../../types'
import { documentResult, foundFixture } from '../fixtures'
import { types } from '../types'

// The spec for a source's credibility. It copies the host rule rather than importing it, so the metric
// checks the output and not the code. A host is official when it is one of the official portals or a
// subdomain of one. Any other .go.id host is government. Every other URL, and any text that is not a
// URL, is open web.
const OFFICIAL_HOSTS = [
  'peraturan.go.id',
  'peraturan.bpk.go.id',
  'jdihn.go.id',
  'jdih.atrbpn.go.id',
  'jdih.jatimprov.go.id',
  'jdih.surabaya.go.id',
]

function credibilityOf(url: string): SourceCredibility {
  let host: string

  try {
    host = new URL(url).hostname
  } catch {
    return 'open_web'
  }

  if (OFFICIAL_HOSTS.some((official) => host === official || host.endsWith(`.${official}`)))
    return 'official'

  if (host.endsWith('.go.id')) return 'government'

  return 'open_web'
}

const credibility = types.defineMetric({
  name: 'credibility',
  dataType: 'BOOLEAN',
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    for (const result of Object.values(output.levels).flat()) {
      const expected = credibilityOf(result.sourceUrl)

      if (result.credibility !== expected)
        problems.push(`"${result.title}" is ${result.credibility}, expected ${expected}`)
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

// A control is one Document Result at the given URL, labelled with the credibility to check.
function oneResult(sourceUrl: string, label: SourceCredibility): DocumentsResult {
  return foundFixture({
    city: [
      documentResult({
        title: 'Peraturan Wali Kota Surabaya Nomor 118 Tahun 2023 tentang Bangunan Gedung',
        docType: 'Perwali',
        sourceUrl,
        level: 'city',
        credibility: label,
      }),
    ],
  })
}

const controlCases = defineEvalCases([
  { id: 'go-id-lookalike', input: 'go-id-lookalike', expected: { status: 'found' } },
  { id: 'surabaya-go-id-subdomain', input: 'surabaya-go-id-subdomain', expected: { status: 'found' } },
  { id: 'uppercase-host', input: 'uppercase-host', expected: { status: 'found' } },
  { id: 'not-a-url', input: 'not-a-url', expected: { status: 'found' } },
  { id: 'bare-go-id', input: 'bare-go-id', expected: { status: 'found' } },
  { id: 'official-marked-open-web', input: 'official-marked-open-web', expected: { status: 'found' } },
])

const fixtures: Record<string, DocumentsResult> = {
  'go-id-lookalike': oneResult('https://go.id.example.com/peraturan/118', 'open_web'),
  'surabaya-go-id-subdomain': oneResult('https://xjdih.surabaya.go.id/peraturan/118', 'government'),
  'uppercase-host': oneResult('https://JDIH.SURABAYA.GO.ID/peraturan/4301', 'official'),
  'not-a-url': oneResult('not a url', 'open_web'),
  'bare-go-id': oneResult('https://surabaya.go.id/peraturan/118', 'government'),
  'official-marked-open-web': oneResult('https://jdih.surabaya.go.id/peraturan/4301', 'open_web'),
}

export const credibilityControl = defineEvalSuite({
  name: 'credibility-control',
  cases: controlCases,
  target: (_input, testCase) => fixtures[testCase.id],
  metrics: [credibility],
})

export const credibilityControlExpectations = defineEvalExpectations(credibilityControl, {
  outcomes: {
    'go-id-lookalike': { credibility: 'pass' },
    'surabaya-go-id-subdomain': { credibility: 'pass' },
    'uppercase-host': { credibility: 'pass' },
    'not-a-url': { credibility: 'pass' },
    'bare-go-id': { credibility: 'pass' },
    'official-marked-open-web': { credibility: 'fail' },
  },
})

export { credibility }
