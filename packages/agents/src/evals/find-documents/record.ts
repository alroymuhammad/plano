import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import type { PipelineObservabilityOptions } from '@anvia/core/pipeline'
import { createFindDocumentsPipeline } from '../../workflows/find-documents/pipeline'
import { cases, type PdfProbe, type Recording, recordingsDir } from './cases'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { force: { type: 'boolean' } },
})
const selected = positionals.length > 0 ? positionals : cases.map((c) => c.id)
const unknown = selected.filter((id) => !cases.some((c) => c.id === id))

if (unknown.length > 0) {
  console.error(`unknown case id: ${unknown.join(', ')}\nusage: eval:record [caseId ...] [--force]`)
  process.exit(2)
}

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

async function record(caseId: string, prompt: string): Promise<Recording> {
  const stages: Record<string, unknown> = {}
  const observability: PipelineObservabilityOptions = {
    observers: {
      recorder: {
        startRun: () => ({
          startStage: ({ path }) => ({
            end: ({ output }) => {
              stages[path.at(-1) ?? ''] = output
            },
          }),
          end: () => {},
        }),
      },
    },
  }
  const started = Date.now()
  let output: Recording['output'] = null
  let error: string | null = null

  try {
    output = (
      await createFindDocumentsPipeline({ observability }).run({
        input: { findDocumentPrompt: prompt },
      })
    ).output
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught)
  }

  const durationMs = Date.now() - started
  const search = stages.search as { plan?: Recording['plan']; queries?: string[]; found?: string }
  const pdfUrls = [...new Set(output?.documents.flatMap((d) => (d.pdfUrl ? [d.pdfUrl] : [])))]
  const pdfs = Object.fromEntries(
    await Promise.all(pdfUrls.map(async (url) => [url, await probePdf(url)] as const)),
  )

  return {
    caseId,
    prompt,
    recordedAt: new Date().toISOString(),
    durationMs,
    error,
    output,
    plan: search?.plan ?? null,
    queries: search?.queries ?? [],
    found: search?.found ?? '',
    pdfs,
  }
}

mkdirSync(recordingsDir, { recursive: true })

for (const testCase of cases.filter((c) => selected.includes(c.id))) {
  const file = new URL(`${testCase.id}.json`, recordingsDir)

  if (existsSync(file) && !values.force) {
    console.log(`skip ${testCase.id}: already recorded (--force to record again)`)
    continue
  }

  console.log(`record ${testCase.id}`)
  const recording = await record(testCase.id, testCase.input)

  if (recording.error) {
    console.log(`  not saved, record again: ${recording.error}`)
    continue
  }

  writeFileSync(file, `${JSON.stringify(recording, null, 2)}\n`)
  console.log(`  ${recording.output?.status}, ${recording.queries.length} queries`)
}
