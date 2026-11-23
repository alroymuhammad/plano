import type { AgentPrompt, MemoryScope, MemoryStore } from '@anvia/core'
import type { AgentObservabilityOptions } from '@anvia/core/observability'

export type Provider = 'openai' | 'anthropic'

export type RunAgentOptions = {
  prompt: AgentPrompt
  provider?: Provider
  modelId?: string
  memory?: MemoryStore
  session?: MemoryScope
  observability?: AgentObservabilityOptions
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

export type DocumentsResult =
  | {
      status: 'out_of_scope'
      reply: string
    }
  | {
      status: 'found'
      levels: Record<JurisdictionLevel, DocumentResult[]>
    }
