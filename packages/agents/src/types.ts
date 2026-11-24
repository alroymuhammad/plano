import type { AgentPrompt, MemoryScope, MemoryStore } from '@anvia/core'
import type { AgentObservabilityOptions } from '@anvia/core/observability'
import type { PipelineObservabilityOptions } from '@anvia/core/pipeline'
import { z } from 'zod'

export type Provider = 'openai' | 'anthropic'

export type RunAgentOptions = {
  prompt: AgentPrompt
  instructions?: string
  provider?: Provider
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

// Step 3: the answer.
export const DocumentsResultSchema = z.object({
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
