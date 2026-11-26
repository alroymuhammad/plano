import type { CompletionModel } from '@anvia/core'
import { gEval } from '@anvia/core/evals'
import { Pipeline, type PipelineObservabilityOptions } from '@anvia/core/pipeline'
import { z } from 'zod'
import { getModel, JUDGE_MODEL } from '../../utils/model'
import type { FindDocumentsRun, FindDocumentsExpected } from './cases'

const REPLACED_RULES = ['Perda Kota Surabaya 12/2014 (RTRW) is replaced by Perda 3/2025']

function withoutTemperature(base: CompletionModel): CompletionModel {
  return Object.assign(Object.create(base), {
    completion: ((request, options) =>
      base.completion(
        { ...request, temperature: undefined },
        options,
      )) satisfies CompletionModel['completion'],
  })
}

function withPipelineTracing(
  base: CompletionModel,
  observability: PipelineObservabilityOptions,
): CompletionModel {
  return Object.assign(Object.create(base), {
    completion: ((request, options) =>
      new Pipeline({
        id: 'find-documents-judge',
        name: 'Find Documents judge',
        metadata: { provider: base.provider, modelId: base.modelId },
        inputSchema: z.null(),
        observability,
      })
        .step({ id: 'completion', run: () => base.completion(request, options) })
        .run({ input: null, abortSignal: options?.abortSignal })
        .then((result) => result.output)) satisfies CompletionModel['completion'],
  })
}

const actual = ({ output }: { output: FindDocumentsRun }) =>
  JSON.stringify(output.error ? { error: output.error } : output.output, null, 2)

export function createJudgeMetrics(observability: PipelineObservabilityOptions) {
  const model = withoutTemperature(withPipelineTracing(getModel(JUDGE_MODEL), observability))

  const judge = (name: string, criteria: string) =>
    gEval<string, FindDocumentsRun, FindDocumentsExpected, string, ['input', 'actualOutput']>({
      name,
      model,
      criteria,
      evaluationParams: ['input', 'actualOutput'],
      actual,
      required: false,
    })

  return [
    judge(
      'in-force',
      `Judge whether every listed document is the version in force today in Indonesia, not one that a newer rule revoked or replaced. An amendment passes only when its base rule is still in force. Known replacements:\n${REPLACED_RULES.map((r) => `- ${r}`).join('\n')}\nAn answer with no documents passes.`,
    ),
    judge(
      'redirect',
      'Only for an out-of-scope answer: judge whether its message, in the language of the request, says why the request is outside Plano and that Plano covers development and permit documents for Kota Surabaya. An answer with status found passes.',
    ),
    judge(
      'relevance-grounded',
      "Judge whether each document's relevance line says concretely how that rule applies to this request, such as which permit step, zoning check or building limit it sets, rather than a generic line like 'regulates buildings'. An answer with no documents passes.",
    ),
  ]
}
