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
      topics: z.array(z.string()),
      tags: z.array(z.string()),
    }),
  ),
})

const ENRICH_INSTRUCTIONS = `You classify passages of Indonesian spatial planning and building regulations for semantic retrieval.
For each passage in the batch, return an item with its exact index, 1 to ${PASSAGE_ENRICH_MAX_TOPICS} topics, and 0 to ${PASSAGE_ENRICH_MAX_TAGS} concise lowercase Indonesian tags.

Allowed topics (choose 1-${PASSAGE_ENRICH_MAX_TOPICS} that best reflect the legal function of the passage):
- ketentuan_umum: definitions, scope, principles, objectives, general provisions
- kewenangan: government authority, institutional roles, coordination, delegation
- substansi_teknis: spatial plans, zoning, technical standards (KDB, KLB, GSB, height, setbacks, density)
- prosedur: licensing, permit workflows, submissions, approvals, verification steps (KKPR, PBG, SLF)
- hak_kewajiban: rights, obligations, prohibitions, public participation
- pengawasan_sanksi: supervision, enforcement, administrative or criminal sanctions, penalties
- peralihan_penutup: transitional provisions, revocations, effective dates, closing rules
- lampiran: annexes, tables, maps, technical appendices

Tag rules:
- Provide 0 to ${PASSAGE_ENRICH_MAX_TAGS} short lowercase Indonesian keywords, acronyms, or everyday synonyms (for example: "kdb", "koefisien dasar bangunan", "sempadan sungai", "pbg").
- Focus on retrieval terms that complement the formal legal wording.
- Return exactly one item for every passage index provided.`

function buildBatchPrompt(passages: PassageDraft[], context: PassageEnrichContext) {
  const header = `Document: ${context.title} (${context.type}, ${context.area})`
  const items = passages
    .map((passage) => `[index=${passage.index}] ${passage.heading}\n${passage.text}`)
    .join('\n\n---\n\n')

  return `${header}\n\n${items}`
}

function createDefaultEnricher(): PassageEnricher {
  const model = getModel()

  return async (passages, context) => {
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
}

const isPassageTopic = (topic: string): topic is PassageTopic => VALID_TOPICS.has(topic)

const uniqueCapped = <T>(items: T[], max: number) => [...new Set(items)].slice(0, max)

const normalizeTopics = (topics: string[]) =>
  uniqueCapped(
    topics.map((topic) => topic.trim().toLowerCase().replace(/\s+/g, '_')).filter(isPassageTopic),
    PASSAGE_ENRICH_MAX_TOPICS,
  )

const normalizeTags = (tags: string[]) =>
  uniqueCapped(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean), PASSAGE_ENRICH_MAX_TAGS)

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

  return batch.map((passage) => {
    const item = byIndex.get(passage.index)

    if (!item) throw new Error(`Missing enrichment for passage index ${passage.index}`)

    return { ...passage, topics: normalizeTopics(item.topics), tags: normalizeTags(item.tags) }
  })
}

async function enrichBatchWithRetry(
  batch: PassageDraft[],
  context: PassageEnrichContext,
  enricher: PassageEnricher,
): Promise<EnrichedPassage[]> {
  for (let retriesLeft = PASSAGE_ENRICH_MAX_RETRIES; ; retriesLeft--) {
    context.abortSignal?.throwIfAborted()

    try {
      return await enrichBatch(batch, context, enricher)
    } catch (error) {
      if (retriesLeft === 0 || context.abortSignal?.aborted) throw error
    }
  }
}

export async function enrichPassages(
  passages: PassageDraft[],
  context: PassageEnrichContext,
  enricher?: PassageEnricher,
): Promise<EnrichedPassage[]> {
  context.abortSignal?.throwIfAborted()

  if (passages.length === 0) return []

  const batchEnricher = enricher ?? createDefaultEnricher()
  const batchesFailed = new AbortController()
  const abortSignal = context.abortSignal
    ? AbortSignal.any([context.abortSignal, batchesFailed.signal])
    : batchesFailed.signal
  const batchContext = { ...context, abortSignal }
  const batches = chunkBatches(passages, PASSAGE_ENRICH_BATCH_SIZE)
  const results: EnrichedPassage[][] = Array.from({ length: batches.length })
  let nextBatch = 0

  const workerCount = Math.min(PASSAGE_ENRICH_CONCURRENCY, batches.length)
  const workers = Array.from({ length: workerCount }, async () => {
    for (let batchIndex = nextBatch++; batchIndex < batches.length; batchIndex = nextBatch++) {
      try {
        results[batchIndex] = await enrichBatchWithRetry(
          batches[batchIndex],
          batchContext,
          batchEnricher,
        )
      } catch (error) {
        batchesFailed.abort(error)
        throw error
      }
    }
  })

  await Promise.all(workers)

  return results.flat()
}

export function formatPassageEmbeddingText(passage: EnrichedPassage): string {
  const lines = [`${passage.heading}\n${passage.text}`]

  if (passage.topics.length > 0) lines.push(`Topik: ${passage.topics.join(', ')}`)

  if (passage.tags.length > 0) lines.push(`Tag: ${passage.tags.join(', ')}`)

  return lines.join('\n')
}
