import type { AgentPrompt, AnyTool, MemoryScope, MemoryStore } from '@anvia/core'
import type { AgentObservabilityOptions } from '@anvia/core/observability'
import type { PipelineObservabilityOptions } from '@anvia/core/pipeline'
import { z } from 'zod'

export type RunAgentOptions = {
  prompt: AgentPrompt
  instructions?: string
  tools?: AnyTool[]
  modelId?: string
  memory?: MemoryStore
  session?: MemoryScope
  observability?: AgentObservabilityOptions
}

export type FindDocumentsOptions = {
  observability?: PipelineObservabilityOptions
  signal?: AbortSignal
}

const LevelSchema = z.enum(['national', 'province', 'city'])

export const FindDocumentsInputSchema = z.object({
  findDocumentPrompt: z.string().trim().min(1),
})

export const ScopeSchema = z.object({
  inScope: z.boolean(),
  message: z.string(),
})

export const RulePlanSchema = z.object({
  city: z.string(),
  province: z.string(),
  levels: z.array(
    z.object({
      level: LevelSchema,
      needed: z.boolean(),
      reason: z
        .string()
        .describe('Why the applicant must or need not follow this level, in one sentence'),
    }),
  ),
  rules: z.array(
    z.object({
      level: LevelSchema,
      type: z
        .string()
        .describe('Official short type, for example UU, PP, Permen PUPR, Perda, Pergub, Perwali'),
      region: z
        .string()
        .nullable()
        .describe('Issuing region, for example "Kota Surabaya"; null for national rules'),
      number: z.string().nullable(),
      year: z.string().nullable(),
      subject: z.string().describe('What the rule is about, in a few words'),
    }),
  ),
})

export type RulePlan = z.infer<typeof RulePlanSchema>

export const DocumentsResultSchema = z.object({
  status: z.enum(['found', 'out_of_scope']),
  message: z.string().nullable().describe('Why the request is out of scope; null when found'),
  levels: RulePlanSchema.shape.levels,
  notFound: z.array(z.string()).describe('Planned rules with no matching search result'),
  documents: z.array(
    z.object({
      title: z.string(),
      level: LevelSchema,
      url: z.string().nullable(),
      pdfUrl: z.string().nullable(),
      relevance: z.string().describe('Why this document matters for the request, in one sentence'),
    }),
  ),
})

export type DocumentsResult = z.infer<typeof DocumentsResultSchema>
