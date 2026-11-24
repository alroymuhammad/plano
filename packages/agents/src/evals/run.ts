import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { runEvalCli, selectEvalCaseIds } from '@anvia/core/evals'
import { createLens } from '@plano/observability'
import { createFindDocumentsSuite } from './suite'

const usage = 'usage: eval [caseId ...] [--rerun <result.json>] [--save <result.json>]'

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

const usageError = (message: string): never => {
  console.error(`${message}\n${usage}`)
  process.exit(2)
}

const parseCli = () => {
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        rerun: { type: 'string' },
        save: { type: 'string' },
      },
      strict: true,
    })

    return { caseIds: positionals, rerun: values.rerun, save: values.save }
  } catch (error) {
    return usageError(errorText(error))
  }
}

const readPreviousResult = (file: string) => {
  let previous: Parameters<typeof selectEvalCaseIds>[0]

  try {
    previous = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    return usageError(`cannot read ${file}: ${errorText(error)}`)
  }

  if (!Array.isArray(previous?.results)) return usageError(`${file} is not an eval result`)

  return previous
}

async function main() {
  const cli = parseCli()
  const knownIds: readonly string[] = createFindDocumentsSuite().cases.map(
    (testCase) => testCase.id,
  )
  const unknownIds = cli.caseIds.filter((id) => !knownIds.includes(id))

  if (unknownIds.length > 0) usageError(`unknown case id: ${unknownIds.join(', ')}`)

  if (cli.rerun && cli.caseIds.length > 0) usageError('--rerun cannot be combined with case ids')

  const rerunIds = cli.rerun ? selectEvalCaseIds(readPreviousResult(cli.rerun)) : undefined

  if (rerunIds?.length === 0) {
    console.log(`Nothing to rerun: ${cli.rerun} has no failed or invalid cases.`)
    return
  }

  const { client, pipelineObservability } = createLens()

  try {
    const result = await runEvalCli({
      ...createFindDocumentsSuite({ observability: pipelineObservability }),
      reporters: [client.evalReporter()],
      exitCode: true,
      caseIds: rerunIds ?? (cli.caseIds.length > 0 ? cli.caseIds : undefined),
    })

    if (cli.save) writeFileSync(cli.save, `${JSON.stringify(result, null, 2)}\n`)
  } finally {
    await client.close()
  }
}

await main()
