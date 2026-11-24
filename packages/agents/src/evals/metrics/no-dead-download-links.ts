import {
  createEvalTypes,
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  EvalOutcome,
} from '@anvia/core/evals'
import { checkLink } from '../../find-documents/download-check'
import { LEVELS } from '../../find-documents/source-map'
import type { DocumentsResult } from '../../types'

const types = createEvalTypes<string, DocumentsResult>()

// Only a link confirmed dead fails. Unknown links are not counted.
export const noDeadDownloadLinks = types.defineMetric({
  name: 'no-dead-download-links',
  dataType: 'BOOLEAN',
  evaluate: async ({ output, signal }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const urls = LEVELS.flatMap((level) => output.levels[level])
      .map((result) => result.downloadUrl)
      .filter((url): url is string => url !== undefined)
    const checked = await Promise.all(
      urls.map(async (url) => ({ url, status: await checkLink(url, signal) })),
    )
    const dead = checked.filter(({ status }) => status === 'dead').map(({ url }) => url)

    if (dead.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: `confirmed dead download links: ${dead.join(', ')}` })
  },
})

function fabricate(downloadUrl: string): DocumentsResult {
  return {
    status: 'found',
    levels: {
      national: [
        {
          title: 'Control document',
          sourceUrl: 'https://example.com/source',
          excerpt: 'Control excerpt',
          credibility: 'official',
          jurisdictionLevel: 'national',
          docType: 'Other',
          downloadUrl,
        },
      ],
      province: [],
      city: [],
    },
    understanding: {
      inScope: true,
      topic: 'control',
      documentTypes: ['PP'],
      city: 'Surabaya',
      province: 'Jawa Timur',
      searchPhrases: { national: 'control', province: 'control', city: 'control' },
    },
  }
}

// Negative control: a fabricated result with a known-dead link must fail this metric.
const controlCases = defineEvalCases([
  { id: 'known-404', input: 'https://httpbin.org/status/404' },
  { id: 'unresolvable-domain', input: 'https://no-such-host.invalid/' },
  { id: 'live-link', input: 'https://example.com/' },
])

export const noDeadDownloadLinksControl = defineEvalSuite({
  name: 'no-dead-download-links-control',
  cases: controlCases,
  target: (downloadUrl) => fabricate(downloadUrl),
  metrics: [noDeadDownloadLinks],
})

export const noDeadDownloadLinksControlExpectations = defineEvalExpectations(
  noDeadDownloadLinksControl,
  {
    outcomes: {
      'known-404': { 'no-dead-download-links': 'fail' },
      'unresolvable-domain': { 'no-dead-download-links': 'fail' },
      'live-link': { 'no-dead-download-links': 'pass' },
    },
  },
)
