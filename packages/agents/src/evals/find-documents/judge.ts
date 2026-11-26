import type { CompletionModel } from '@anvia/core'
import { gEval } from '@anvia/core/evals'
import { Pipeline, type PipelineObservabilityOptions } from '@anvia/core/pipeline'
import { z } from 'zod'
import { getModel, JUDGE_MODEL } from '../../utils/model'
import type { FindDocumentsExpected, FindDocumentsRun } from './cases'

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
      'query-fit',
      'The request is an Indonesian analyst asking for development, permit or planning documents in Kota Surabaya. Judge whether the documents match the breadth of the request: a broad request gets the main documents for it without every loosely related rule, and a narrow request still gets the document it names. An out-of-scope answer fits when the request is not about Surabaya planning documents.',
    ),
    judge(
      'level-reasoning',
      'Judge whether each level (national, province, city) is correctly marked needed or not needed for this request in Kota Surabaya, and whether each reason is legally sound under Indonesian law, for example which government issues a building permit (PBG) under PP 16/2021. An out-of-scope answer has no levels and passes.',
    ),
    judge(
      'usefulness',
      'Judge whether an analyst who knows Indonesian planning law would find this answer useful as a starting list of documents to read: the right rules, official sources, working links, and nothing misleading. The tool collects documents; it never decides permits. An out-of-scope answer is useful when its message clearly says why and what Plano covers.',
    ),
  ]
}
