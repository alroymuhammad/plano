import type { AgentPrompt, MemoryScope, MemoryStore } from '@anvia/core'
import type { AgentObservabilityOptions } from '@anvia/core/observability'
import type { PipelineObservabilityOptions } from '@anvia/core/pipeline'

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

export type QueryUnderstanding = {
  topic: string
  documentTypes: string[]
  city: string
  province: string
  inScope: boolean
  searchPhrases: Record<JurisdictionLevel, string>
}

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
