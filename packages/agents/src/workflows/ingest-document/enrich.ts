import { generateCompletion } from '@anvia/core'
import { z } from 'zod'
import type {
  EnrichedPassage,
  PassageDraft,
  PassageEnrichContext,
  PassageEnricher,
  PassageEnrichmentItem,
  PassageTopic,
} from '../../types'
import { getModel } from '../../utils/model'
import {
  PASSAGE_ENRICH_BATCH_SIZE,
  PASSAGE_ENRICH_CONCURRENCY,
  PASSAGE_ENRICH_MAX_RETRIES,
  PASSAGE_ENRICH_MAX_TAGS,
  PASSAGE_ENRICH_MAX_TOPICS,
  PASSAGE_TOPICS,
} from './constants'

const VALID_TOPICS = new Set<string>(PASSAGE_TOPICS)

const PassageEnrichmentResponseSchema = z.object({
  passages: z.array(
    z.object({
      index: z.number().int(),
      topics: z.array(z.enum(PASSAGE_TOPICS)).min(1).max(PASSAGE_ENRICH_MAX_TOPICS),
      tags: z.array(z.string()),
    }),
  ),
})

const ENRICH_INSTRUCTIONS = `You classify passages of Indonesian spatial planning and building regulations for semantic retrieval.
For each passage in the batch, return an item with its exact index, 1 to 3 topics, and 0 to 6 concise lowercase Indonesian tags.

Allowed topics (choose 1-3 that best reflect the legal function of the passage):
- ketentuan_umum: definitions, scope, principles, objectives, general provisions
- kewenangan: government authority, institutional roles, coordination, delegation
- substansi_teknis: spatial plans, zoning, technical standards (KDB, KLB, GSB, height, setbacks, density)
- prosedur: licensing, permit workflows, submissions, approvals, verification steps (KKPR, PBG, SLF)
- hak_kewajiban: rights, obligations, prohibitions, public participation
- pengawasan_sanksi: supervision, enforcement, administrative or criminal sanctions, penalties
- peralihan_penutup: transitional provisions, revocations, effective dates, closing rules
- lampiran: annexes, tables, maps, technical appendices

Tag rules:
- Provide 0 to 6 short lowercase Indonesian keywords, acronyms, or everyday synonyms (for example: "kdb", "koefisien dasar bangunan", "sempadan sungai", "pbg").
- Focus on retrieval terms that complement the formal legal wording.
- Return exactly one item for every passage index provided.`

function buildBatchPrompt(passages: PassageDraft[], context: PassageEnrichContext) {
  const header = `Document: ${context.title} (${context.type}, ${context.area})`
  const items = passages
    .map((passage) => `[index=${passage.index}] ${passage.heading}\n${passage.text}`)
    .join('\n\n---\n\n')

  return `${header}\n\n${items}`
}

async function defaultEnrichBatch(
  passages: PassageDraft[],
  context: PassageEnrichContext,
  model: ReturnType<typeof getModel>,
): Promise<PassageEnrichmentItem[]> {
  const result = await generateCompletion({
    model,
    instructions: ENRICH_INSTRUCTIONS,
    prompt: buildBatchPrompt(passages, context),
    outputSchema: PassageEnrichmentResponseSchema,
    retries: false,
    abortSignal: context.abortSignal,
  })

  return result.output.passages
}

function normalizeTopics(topics: readonly PassageTopic[]): PassageTopic[] {
  const seen = new Set<PassageTopic>()

  for (const topic of topics) {
    if (!VALID_TOPICS.has(topic)) continue

    seen.add(topic)

    if (seen.size >= PASSAGE_ENRICH_MAX_TOPICS) break
  }

  return [...seen]
}

function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()

  for (const raw of tags) {
    const tag = raw.trim().toLowerCase()

    if (!tag) continue

    seen.add(tag)

    if (seen.size >= PASSAGE_ENRICH_MAX_TAGS) break
  }

  return [...seen]
}

function chunkBatches<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size))
  }

  return batches
}

async function enrichBatch(
  batch: PassageDraft[],
  context: PassageEnrichContext,
  enricher: PassageEnricher,
): Promise<EnrichedPassage[]> {
  const items = await enricher(batch, context)
  const expectedIndices = new Set(batch.map((passage) => passage.index))
  const byIndex = new Map<number, PassageEnrichmentItem>()

  for (const item of items) {
    if (!expectedIndices.has(item.index)) {
      throw new Error(`Unexpected enrichment for passage index ${item.index}`)
    }

    if (byIndex.has(item.index)) {
      throw new Error(`Duplicate enrichment for passage index ${item.index}`)
    }

    byIndex.set(item.index, item)
  }

  const enriched: EnrichedPassage[] = []

  for (const passage of batch) {
    const item = byIndex.get(passage.index)

    if (!item) throw new Error(`Missing enrichment for passage index ${passage.index}`)

    enriched.push({
      ...passage,
      topics: normalizeTopics(item.topics),
      tags: normalizeTags(item.tags),
    })
  }

  return enriched
}

async function enrichBatchWithRetry(
  batch: PassageDraft[],
  context: PassageEnrichContext,
  enricher: PassageEnricher,
  isStopped: () => boolean,
): Promise<EnrichedPassage[]> {
  const maxAttempts = 1 + PASSAGE_ENRICH_MAX_RETRIES

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    context.abortSignal?.throwIfAborted()

    try {
      return await enrichBatch(batch, context, enricher)
    } catch (error) {
      if (attempt >= maxAttempts || context.abortSignal?.aborted || isStopped()) throw error
    }
  }

  throw new Error('Unreachable enrichment retry state')
}

export async function enrichPassages(
  passages: PassageDraft[],
  context: PassageEnrichContext,
  enricher?: PassageEnricher,
): Promise<EnrichedPassage[]> {
  context.abortSignal?.throwIfAborted()

  if (passages.length === 0) return []

  let batchEnricher: PassageEnricher

  if (enricher) {
    batchEnricher = enricher
  } else {
    const model = getModel()
    batchEnricher = (batch, batchContext) => defaultEnrichBatch(batch, batchContext, model)
  }

  const controller = new AbortController()
  const parentSignal = context.abortSignal
  const onParentAbort = () => controller.abort(parentSignal?.reason)

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason)
    } else {
      parentSignal.addEventListener('abort', onParentAbort, { once: true })
    }
  }

  const batchContext: PassageEnrichContext = {
    ...context,
    abortSignal: controller.signal,
  }
  const batches = chunkBatches(passages, PASSAGE_ENRICH_BATCH_SIZE)
  const results: EnrichedPassage[][] = Array.from({ length: batches.length })
  let nextBatch = 0
  let failed = false

  const workerCount = Math.min(PASSAGE_ENRICH_CONCURRENCY, batches.length)
  const workers = Array.from({ length: workerCount }, async () => {
    while (!failed) {
      batchContext.abortSignal?.throwIfAborted()

      const batchIndex = nextBatch++

      if (batchIndex >= batches.length) return

      try {
        results[batchIndex] = await enrichBatchWithRetry(
          batches[batchIndex],
          batchContext,
          batchEnricher,
          () => failed,
        )
      } catch (error) {
        failed = true
        controller.abort(error)
        throw error
      }
    }
  })

  try {
    await Promise.all(workers)
  } finally {
    parentSignal?.removeEventListener('abort', onParentAbort)
  }

  return results.flat()
}

export function formatPassageEmbeddingText(passage: EnrichedPassage): string {
  const lines = [`${passage.heading}\n${passage.text}`]

  if (passage.topics.length > 0) lines.push(`Topik: ${passage.topics.join(', ')}`)

  if (passage.tags.length > 0) lines.push(`Tag: ${passage.tags.join(', ')}`)

  return lines.join('\n')
}
