import { existsSync, readFileSync } from 'node:fs'
import { defineEvalSuite, runEvalCli } from '@anvia/core/evals'
import { createLens } from '@plano/observability'
import { cases, type Recording, recordingsDir } from './cases'
import { deterministicMetrics } from './deterministic'

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

const suite = defineEvalSuite({
  name: 'find-documents',
  cases,
  target: (input, testCase): Recording => {
    const file = new URL(`${testCase.id}.json`, recordingsDir)

    if (!existsSync(file)) throw new Error(`no recording; run pnpm eval:record ${testCase.id}`)

    const recording: Recording = JSON.parse(readFileSync(file, 'utf8'))

    if (recording.prompt !== input)
      throw new Error(`recording is stale; run pnpm eval:record ${testCase.id} --force`)

    return recording
  },
  metrics: [...deterministicMetrics, ...judgeMetrics],
})

try {
  await runEvalCli({
    ...suite,
    exitCode: true,
    maxValueLength: 300,
    caseIds: selected.length > 0 ? selected : undefined,
  })
} finally {
  await client
    .close()
    .catch((error) => console.warn('Lens close failed; traces may be lost:', error))
}
