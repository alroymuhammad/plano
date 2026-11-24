import type { AgentPrompt, MemoryScope, MemoryStore, Usage } from '@anvia/core'
import type { AgentObservabilityOptions } from '@anvia/core/observability'
import type { PipelineObservabilityOptions } from '@anvia/core/pipeline'
import { z } from 'zod'

export type Provider = 'openai' | 'anthropic'

export type RunAgentOptions = {
  prompt: AgentPrompt
  provider?: Provider
  modelId?: string
  memory?: MemoryStore
  session?: MemoryScope
  observability?: AgentObservabilityOptions
}

export type FindDocumentsOptions = {
  observability?: PipelineObservabilityOptions
  signal?: AbortSignal
  onSearch?: (level: JurisdictionLevel, sourceUrls: string[]) => void
  onUsage?: (usage: Usage) => void
}

export type JurisdictionLevel = 'national' | 'province' | 'city'

export type SourceCredibility = 'official' | 'government' | 'open_web'

export type DocumentResult = {
  title: string
  sourceUrl: string
  excerpt: string
  credibility: SourceCredibility
  jurisdictionLevel: JurisdictionLevel
  docType: string
}

export const QueryUnderstandingSchema = z.object({
  inScope: z.boolean(),
  topic: z.string(),
  documentTypes: z.array(z.string()),
  city: z.string(),
  province: z.string(),
  searchPhrases: z.object({
    national: z.string(),
    province: z.string(),
    city: z.string(),
  }),
})

export type QueryUnderstanding = z.infer<typeof QueryUnderstandingSchema>

export type DocumentsResult =
  | {
      status: 'out_of_scope'
      reply: string
      understanding: QueryUnderstanding
    }
  | {
      status: 'found'
      levels: Record<JurisdictionLevel, DocumentResult[]>
      understanding: QueryUnderstanding
    }
