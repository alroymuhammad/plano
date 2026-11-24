import { Usage } from '@anvia/core'
import { defineEvalCases, defineEvalSuite, EvalOutcome } from '@anvia/core/evals'
import type { EvalTargetContext } from '@anvia/core/evals'
import { findDocuments } from '../index'
import { LEVELS } from '../find-documents/source-map'
import type { DocumentResult, FindDocumentsOptions, JurisdictionLevel } from '../types'
import { credibility } from './metrics/credibility'
import { docType } from './metrics/doc-type'
import { level } from './metrics/level'
import { listingUrls } from './metrics/listing-urls'
import { maxFivePerLevel } from './metrics/max-five-per-level'
import { merge } from './metrics/merge'
import { noDeadDownloadLinks } from './metrics/no-dead-download-links'
import { numberAndYear } from './metrics/number-and-year'
import { numberYear } from './metrics/number-year'
import { officialAboveUnofficial } from './metrics/official-above-unofficial'
import { outOfScopeRejected } from './metrics/out-of-scope-rejected'
import { region } from './metrics/region'
import { urlInSource } from './metrics/url-in-source'
import type { FindDocumentsEvalOutput } from './types'
import { evalTypes } from './types'

// Mutable so Studio's eval type accepts it. defineEvalCases returns a readonly tuple.
const cases = [
  ...defineEvalCases([
    {
      id: 'surabaya-permit',
      input: 'dokumen terkait izin pembangunan di Surabaya',
      expected: { status: 'found' },
    },
    {
      id: 'malang-out-of-scope',
      input: 'dokumen terkait izin pembangunan di Malang',
      expected: { status: 'out_of_scope' },
    },
    {
      id: 'bandung-out-of-scope',
      input: 'dokumen terkait izin pembangunan di Bandung',
      expected: { status: 'out_of_scope' },
    },
    {
      id: 'off-topic-out-of-scope',
      input: 'resep rendang yang enak',
      expected: { status: 'out_of_scope' },
    },
  ]),
]

const scope = evalTypes.defineMetric({
  name: 'scope',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output, case: testCase }) => {
    if (output.status === testCase.expected?.status) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, {
      comment: `expected ${testCase.expected?.status}, got ${output.status}`,
    })
  },
})

function resultProblems(jurisdiction: JurisdictionLevel, result: DocumentResult) {
  const problems: string[] = []
  const fields = ['title', 'sourceUrl', 'excerpt', 'credibility', 'docType'] as const

  for (const field of fields) {
    if (!result[field]) problems.push(`${jurisdiction} result is missing ${field}`)
  }

  if (result.jurisdictionLevel !== jurisdiction)
    problems.push(`${jurisdiction} result is tagged ${result.jurisdictionLevel}`)

  return problems
}

const documents = evalTypes.defineMetric({
  name: 'documents',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    if (output.status !== 'found') return EvalOutcome.pass(true)

    const problems: string[] = []

    if (!LEVELS.some((jurisdiction) => output.levels[jurisdiction].length > 0))
      problems.push('no level has any Document Results')

    for (const jurisdiction of LEVELS) {
      const results = output.levels[jurisdiction]

      for (const result of results) problems.push(...resultProblems(jurisdiction, result))
    }

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

const understanding = evalTypes.defineMetric({
  name: 'understanding',
  dataType: 'BOOLEAN',
  required: true,
  evaluate: ({ output }) => {
    const { understanding: read } = output
    const problems: string[] = []
    const emptyPhrases = LEVELS.filter(
      (jurisdiction) => read.searchPhrases[jurisdiction].trim() === '',
    )

    if (read.inScope !== (output.status === 'found'))
      problems.push('understanding inScope does not match the status')

    if (read.topic.trim() === '') problems.push('understanding has no topic')

    if (read.inScope && read.documentTypes.length === 0)
      problems.push('understanding has no documentTypes')

    if (read.inScope && emptyPhrases.length > 0)
      problems.push(`empty search phrases: ${emptyPhrases.join(', ')}`)

    if (problems.length === 0) return EvalOutcome.pass(true)

    return EvalOutcome.fail(false, { comment: problems.join('; ') })
  },
})

// Every trust rule gates the exit code, so the dead-link rule is required here, not in its own file.
const requiredDeadLinks: typeof noDeadDownloadLinks = { ...noDeadDownloadLinks, required: true }

// Mutable so Studio's eval type accepts it.
const metrics = [
  scope,
  documents,
  understanding,
  outOfScopeRejected,
  officialAboveUnofficial,
  urlInSource,
  requiredDeadLinks,
  numberAndYear,
  maxFivePerLevel,
  credibility,
  docType,
  level,
  listingUrls,
  merge,
  numberYear,
  region,
]

type SuiteOptions = Pick<FindDocumentsOptions, 'observability'>

export function createFindDocumentsSuite(options: SuiteOptions = {}) {
  return defineEvalSuite({
    name: 'find-documents',
    cases,
    targetConcurrency: 2,
    // Budget per case: one read-query model call, seven parallel Tavily searches (four national
    // portals, province, city and the open web) and the download-link stage (capped at 8 s), with
    // headroom. Tavily cannot be aborted, so a search already in flight keeps running after the
    // signal fires.
    caseTimeoutMs: 120_000,
    target: async (
      input,
      _testCase,
      context?: EvalTargetContext,
    ): Promise<FindDocumentsEvalOutput> => {
      const searched: FindDocumentsEvalOutput['searched'] = {}
      let usage = Usage.empty()

      const result = await findDocuments(input, {
        observability: options.observability,
        signal: context?.signal,
        onSearch: (jurisdiction, sourceUrls) => {
          searched[jurisdiction] = [...(searched[jurisdiction] ?? []), ...sourceUrls]
        },
        onUsage: (next) => {
          usage = Usage.add(usage, next)
        },
      })

      return { ...result, searched, usage }
    },
    targetUsage: ({ output }) => output.usage,
    metrics,
  })
}
