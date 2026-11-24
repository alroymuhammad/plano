import {
  createEvalTypes,
  defineEvalCases,
  defineEvalExpectations,
  defineEvalSuite,
  EvalOutcome,
} from '@anvia/core/evals'
import { checkLink, downloadUrlOf } from '../../find-documents/download-check'
import { LEVELS } from '../../find-documents/source-map'
import type { DocumentResult, DocumentsResult } from '../../types'

const types = createEvalTypes<unknown, DocumentsResult>()

// Fails a kept download link that is confirmed dead, and a live file link that the stage did not keep.
// An unknown link is never counted.
async function problemOf(result: DocumentResult, signal: AbortSignal): Promise<string | undefined> {
  if (result.downloadUrl) {
    const status = await checkLink(result.downloadUrl, signal)

    return status === 'dead' ? `dead download link kept: ${result.downloadUrl}` : undefined
  }

  const candidate = downloadUrlOf(
    [result.sourceUrl, result.officialUrl].filter((url): url is string => url !== undefined),
  )

  if (!candidate) return undefined

  const status = await checkLink(candidate, signal)

  return status === 'alive' ? `live file link not kept: ${candidate}` : undefined
}

export const noDeadDownloadLinks = types.defineMetric({
  name: 'no-dead-download-links',
  dataType: 'BOOLEAN',
  evaluate: async ({ output, signal }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems = await Promise.all(
      LEVELS.flatMap((level) => output.levels[level]).map((result) => problemOf(result, signal)),
    )
    const failed = problems.filter((problem): problem is string => problem !== undefined)

    if (failed.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: failed.join('; ') })
  },
})

type ControlInput = { sourceUrl: string; downloadUrl?: string }

function fabricate({ sourceUrl, downloadUrl }: ControlInput): DocumentsResult {
  return {
    status: 'found',
    levels: {
      national: [
        {
          title: 'Control document',
          sourceUrl,
          excerpt: 'Control excerpt',
          credibility: 'official',
          jurisdictionLevel: 'national',
          docType: 'Other',
          number: null,
          year: null,
          alternateUrls: [],
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

// Each control must get its expected verdict, so a metric that always passes or always fails is caught.
const controlCases = defineEvalCases([
  {
    id: 'known-404',
    input: {
      sourceUrl: 'https://example.com/source',
      downloadUrl: 'https://httpbin.org/status/404',
    },
  },
  {
    id: 'unresolvable-domain',
    input: {
      sourceUrl: 'https://example.com/source',
      downloadUrl: 'https://no-such-host.invalid/',
    },
  },
  {
    id: 'live-link',
    input: { sourceUrl: 'https://example.com/source', downloadUrl: 'https://example.com/' },
  },
  {
    id: 'live-file-not-kept',
    input: { sourceUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
  },
  {
    id: 'dead-file-absent',
    input: { sourceUrl: 'https://no-such-host.invalid/dummy.pdf' },
  },
])

export const noDeadDownloadLinksControl = defineEvalSuite({
  name: 'no-dead-download-links-control',
  cases: controlCases,
  target: (input) => fabricate(input),
  metrics: [noDeadDownloadLinks],
})

export const noDeadDownloadLinksControlExpectations = defineEvalExpectations(
  noDeadDownloadLinksControl,
  {
    outcomes: {
      'known-404': { 'no-dead-download-links': 'fail' },
      'unresolvable-domain': { 'no-dead-download-links': 'fail' },
      'live-link': { 'no-dead-download-links': 'pass' },
      'live-file-not-kept': { 'no-dead-download-links': 'fail' },
      'dead-file-absent': { 'no-dead-download-links': 'pass' },
    },
  },
)
