import type { AgentPrompt, MemoryScope, MemoryStore } from '@anvia/core'
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
}

const LevelSchema = z.enum(['national', 'province', 'city'])

export const FindDocumentsInputSchema = z.object({
  findDocumentPrompt: z.string().trim().min(1),
})

// Step 1: what the user needs, and which rules apply in their city.
export const ClarificationSchema = z.object({
  request: z.string().describe('What the user asks for, in one sentence'),
  city: z.string(),
  province: z.string(),
  rules: z.array(
    z.object({
      name: z.string().describe('The rule, for example "Peraturan Pemerintah Nomor 16 Tahun 2021"'),
      level: LevelSchema,
      why: z.string().describe('Why this rule applies to the request'),
    }),
  ),
})

// Step 2: documents the web search found.
export const SearchResultsSchema = z.object({
  request: z.string(),
  documents: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      pdfUrl: z.string().nullable(),
      rule: z.string().describe('The rule from step 1 this document is'),
      excerpt: z.string(),
    }),
  ),
})

// Step 3: the answer.
export const DocumentsResultSchema = z.object({
  documents: z.array(
    z.object({
      title: z.string(),
      level: LevelSchema,
      url: z.string(),
      pdfUrl: z.string().nullable(),
      relevance: z.string().describe('Why this document matters for the request, in one sentence'),
    }),
  ),
})

export type DocumentsResult = z.infer<typeof DocumentsResultSchema>
