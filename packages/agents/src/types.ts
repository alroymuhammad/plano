import type { AgentPrompt, AnyTool, MemoryScope, MemoryStore } from '@anvia/core'
import type { EmbeddingModel } from '@anvia/core/embeddings'
import type { AgentObservabilityOptions } from '@anvia/core/observability'
import type { PipelineObservabilityOptions } from '@anvia/core/pipeline'
import type { LibraryStore } from '@plano/db'
import { z } from 'zod'
import type { PASSAGE_TOPICS } from './workflows/ingest-document/constants'

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

const DocumentStatusSchema = z.enum(['active', 'superseded', 'revoked'])

export const IngestDocumentInputSchema = z.object({
  path: z.string().trim().min(1).describe('Absolute path to the PDF on this machine'),
  title: z.string().trim().min(1),
  type: z.string().trim().min(1).describe('For example Perda, Perwali, RTRW, RDTR, RPJMD'),
  number: z.string().trim().min(1).nullable().default(null),
  year: z.number().int().nullable().default(null),
  area: z.string().trim().min(1).describe('Area the document covers, for example Kota Surabaya'),
  status: DocumentStatusSchema.default('active'),
})

export type IngestDocumentInput = z.input<typeof IngestDocumentInputSchema>

export type IngestDocumentOptions = {
  library: LibraryStore
  analystId: string
  storageDir: string
  ocrDataDir: string
  embeddingModel?: EmbeddingModel
  enricher?: PassageEnricher
  collectionName?: string
  observability?: PipelineObservabilityOptions
  signal?: AbortSignal
}

export type PassageMetadata = {
  analystId: string
  documentId: string
  confirmed: boolean
  status: 'active' | 'superseded' | 'revoked'
  title: string
  type: string
  number?: string
  year?: number
  heading: string
  pageStart: number
  pageEnd: number
}

export type SearchLibraryOptions = {
  embeddingModel?: EmbeddingModel
  collectionName?: string
}

export type ExtractedPage = { page: number; text: string; ocr: boolean }

export type PassageDraft = {
  index: number
  heading: string
  text: string
  pageStart: number
  pageEnd: number
}

export type PassageTopic = (typeof PASSAGE_TOPICS)[number]

export type PassageEnrichment = {
  topics: PassageTopic[]
  tags: string[]
}

export type PassageEnrichmentItem = { index: number; topics: string[]; tags: string[] }

export type EnrichedPassage = PassageDraft & PassageEnrichment

export type PassageEnrichContext = {
  title: string
  type: string
  area: string
  abortSignal?: AbortSignal
}

export type PassageEnricher = (
  passages: PassageDraft[],
  context: PassageEnrichContext,
) => Promise<PassageEnrichmentItem[]>

export type IngestDocumentResult =
  | { documentId: string; skipped: true }
  | {
      documentId: string
      skipped: false
      pageCount: number
      ocrPages: number[]
      passageCount: number
    }
