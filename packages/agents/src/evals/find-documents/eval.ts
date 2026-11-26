import { defineEvalSuite, runEvalCli } from '@anvia/core/evals'
import type { PipelineObservabilityOptions } from '@anvia/core/pipeline'
import { createLens } from '@plano/observability'
import { createFindDocumentsPipeline } from '../../workflows/find-documents/pipeline'
import { cases, type FindDocumentsRun, type PdfProbe } from './cases'
import { deterministicMetrics } from './deterministic'

const CASE_TIMEOUT_MS = 300_000

const args = process.argv.slice(2)
const withJudge = !args.includes('--no-judge')
const selected = args.filter((arg) => arg !== '--no-judge')
const unknown = selected.filter((id) => !cases.some((c) => c.id === id))

if (unknown.length > 0) {
  console.error(`unknown case id: ${unknown.join(', ')}\nusage: eval [caseId ...] [--no-judge]`)
  process.exit(2)
}

const { client, pipelineObservability } = createLens()
const judgeMetrics = withJudge
  ? (await import('./judge')).createJudgeMetrics(pipelineObservability)
  : []

async function probePdf(url: string): Promise<PdfProbe> {
  try {
    const response = await fetch(url, {
      headers: { Range: 'bytes=0-1023' },
      signal: AbortSignal.timeout(15_000),
    })
    const reader = response.body?.getReader()
    const first = reader ? (await reader.read()).value : undefined
    await reader?.cancel()
    const total = response.headers.get('content-range')?.split('/')[1]
    const length = total ?? response.headers.get('content-length')

    return {
      status: response.status,
      isPdf: new TextDecoder().decode(first?.slice(0, 5)) === '%PDF-',
      bytes: length && length !== '*' ? Number(length) : null,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

async function runFindDocuments(prompt: string, signal?: AbortSignal): Promise<FindDocumentsRun> {
  const stages: Record<string, unknown> = {}
  const observability: PipelineObservabilityOptions = {
    observers: {
      stages: {
        startRun: () => ({
          startStage: ({ path }) => ({
            end: ({ output }) => {
              stages[path.at(-1) ?? ''] = output
            },
          }),
          end: () => {},
        }),
      },
      lens: pipelineObservability.observers.lens,
    },
    primaryTrace: 'lens',
  }
  let output: FindDocumentsRun['output'] = null
  let trace: FindDocumentsRun['trace']
  let error: string | null = null

  try {
    const result = await createFindDocumentsPipeline({ observability }).run({
      input: { findDocumentPrompt: prompt },
      abortSignal: signal,
    })
    output = result.output

    if (result.trace?.traceId) trace = { ...result.trace, traceId: result.trace.traceId }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught)
  }

  const search = stages.search as { found?: string } | undefined
  const pdfUrls = [...new Set(output?.documents.flatMap((d) => (d.pdfUrl ? [d.pdfUrl] : [])))]
  const pdfs = Object.fromEntries(
    await Promise.all(pdfUrls.map(async (url) => [url, await probePdf(url)] as const)),
  )

  return {
    error,
    output,
    found: search?.found ?? '',
    pdfs,
    trace,
  }
}

const suite = defineEvalSuite({
  name: 'find-documents',
  cases,
  target: (input, _testCase, context) => runFindDocuments(input, context?.signal),
  metrics: [...deterministicMetrics, ...judgeMetrics],
})

try {
  await runEvalCli({
    ...suite,
    exitCode: true,
    maxValueLength: 300,
    caseIds: selected.length > 0 ? selected : undefined,
    caseTimeoutMs: CASE_TIMEOUT_MS,
    reporters: [client.evalReporter()],
  })
} finally {
  await client
    .close()
    .catch((error) => console.warn('Lens close failed; traces may be lost:', error))
}
