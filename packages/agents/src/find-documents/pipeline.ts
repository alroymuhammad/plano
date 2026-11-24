import { generateCompletion } from '@anvia/core'
import { Pipeline } from '@anvia/core/pipeline'
import { runAgent } from '../core'
import { createWebSearchTool } from '../tools/web-search'
import { searchWeb } from '../tools/web-search/service'
import { z } from 'zod'
import {
  type DocumentsResult,
  DocumentsResultSchema,
  FindDocumentsInputSchema,
  type FindDocumentsOptions,
  type RulePlan,
  RulePlanSchema,
  ScopeSchema,
} from '../types'
import { getModel } from '../utils/model'
import {
  ANSWER_INSTRUCTIONS,
  CLARIFY_INSTRUCTIONS,
  CLARIFY_SEARCHES,
  MAX_RULES,
  PLAN_INSTRUCTIONS,
  SCOPE_INSTRUCTIONS,
} from './instructions'

function ruleName(rule: RulePlan['rules'][number]) {
  const parts = [rule.type, rule.region]

  if (rule.number) parts.push(`Nomor ${rule.number}`)

  if (rule.year) parts.push(`Tahun ${rule.year}`)

  if (!rule.number) parts.push(rule.subject)

  return parts.filter(Boolean).join(' ')
}

export function createFindDocumentsPipeline(options: FindDocumentsOptions = {}) {
  const searchPipeline = createSearchPipeline(options)

  return new Pipeline({
    id: 'find-documents',
    name: 'Find Documents',
    inputSchema: FindDocumentsInputSchema,
    observability: options.observability,
  })
    .step({
      id: 'scope',
      run: async ({ input }) => {
        const result = await generateCompletion({
          model: getModel(),
          prompt: input.findDocumentPrompt,
          instructions: SCOPE_INSTRUCTIONS,
          outputSchema: ScopeSchema,
        })

        return { request: input.findDocumentPrompt, scope: result.output }
      },
    })
    .step({
      id: 'find',
      run: async ({ input, abortSignal }): Promise<DocumentsResult> => {
        if (!input.scope.inScope) {
          return {
            status: 'out_of_scope',
            message: input.scope.message,
            levels: [],
            notFound: [],
            documents: [],
          }
        }

        const { output } = await searchPipeline.run({
          input: { request: input.request },
          abortSignal,
        })

        return output
      },
    })
}

function createSearchPipeline(options: FindDocumentsOptions) {
  return new Pipeline({
    id: 'find-documents-search',
    name: 'Find Documents search',
    inputSchema: z.object({ request: z.string() }),
    observability: options.observability,
  })
    .step({
      id: 'clarify',
      run: async ({ input }) => {
        const rules = await runAgent({
          prompt: input.request,
          instructions: CLARIFY_INSTRUCTIONS,
          tools: [createWebSearchTool(CLARIFY_SEARCHES)],
        }).text

        return { request: input.request, rules }
      },
    })
    .step({
      id: 'plan',
      run: async ({ input }) => {
        const result = await generateCompletion({
          model: getModel(),
          prompt: `Request: ${input.request}\n\nClarified rules:\n${input.rules}`,
          instructions: PLAN_INSTRUCTIONS,
          outputSchema: RulePlanSchema,
        })

        const plan = result.output
        const needed = new Set(plan.levels.filter((l) => l.needed).map((l) => l.level))
        const rules = plan.rules.filter((r) => needed.has(r.level)).slice(0, MAX_RULES)

        return { request: input.request, plan: { ...plan, rules } }
      },
    })
    .step({
      id: 'queries',
      run: ({ input }) => {
        const queries = input.plan.rules.map(ruleName)

        return { ...input, queries }
      },
    })
    .step({
      id: 'search',
      run: async ({ input }) => {
        const found = await Promise.all(
          input.queries.map(async (query) => {
            const results = await searchWeb(query).catch((error: Error) => {
              throw new Error(`search feat is unable to proceed due to ${error.message}`)
            })
            return `## ${query}\n${results}`
          }),
        )

        return { ...input, found: found.join('\n\n') }
      },
    })
    .step({
      id: 'answer',
      run: async ({ input }) => {
        const result = await generateCompletion({
          model: getModel(),
          prompt: `Request: ${input.request}\n\nPlan:\n${JSON.stringify(input.plan, null, 2)}\n\nSearch results per rule:\n${input.found}`,
          instructions: ANSWER_INSTRUCTIONS,
          outputSchema: DocumentsResultSchema.omit({ status: true, message: true }),
        })

        return { status: 'found' as const, message: null, ...result.output }
      },
    })
}
