import { Pipeline, type PipelineObservabilityOptions } from '@anvia/core/pipeline'
import { z } from 'zod'
import { getClient } from '../tools/web-search/service'
import type { DocumentResult, DocumentsResult, JurisdictionLevel } from '../types'
import { getModel } from '../utils/model'
import { credibilityOf, LEVELS, SOURCE_DOMAINS } from './source-map'

const OUT_OF_SCOPE_REPLY =
  'Find Documents only covers Surabaya development and permit documents. Ask about a Surabaya Case, or use web search for other topics.'

const QuerySchema = z.object({
  inScope: z.boolean(),
  topic: z.string(),
  city: z.string(),
  province: z.string(),
  phrases: z.object({
    national: z.string(),
    province: z.string(),
    city: z.string(),
  }),
})

const READ_QUERY_INSTRUCTIONS = `You read an Analyst's question about planning and permit documents in Indonesia.
- inScope: true when the question asks for development or permit documents (for example izin pembangunan, bangunan gedung, tata ruang) and names Surabaya or no city. Surabaya is the only supported city. False for any other city and for off-topic questions.
- city and province: "Surabaya" and "Jawa Timur" for an in-scope question. Otherwise the names the question gives.
- topic: the subject in a few words.
- phrases: one short Indonesian search phrase per level, using official document vocabulary plus the topic. National: Undang-Undang or Peraturan Pemerintah plus the topic. Province: "Peraturan Daerah Jawa Timur" plus one or two title words, such as "bangunan gedung". Leave "izin" and "perizinan" out of the province phrase, because the Jawa Timur index returns nothing for them. City: "Peraturan Wali Kota Surabaya" plus the topic. Use empty strings when inScope is false.
Return only the fields in the schema.`

const DOC_TYPES: Array<[RegExp, string]> = [
  [/^undang-undang\b/i, 'UU'],
  [/^peraturan pemerintah\b/i, 'PP'],
  [/^peraturan presiden\b/i, 'Perpres'],
  [/^peraturan menteri\b/i, 'Permen'],
  [/^peraturan daerah\b/i, 'Perda'],
  [/^peraturan wali ?kota\b/i, 'Perwali'],
  [/^peraturan gubernur\b/i, 'Pergub'],
]

type LevelResults = DocumentResult[] | null

function docTypeOf(title: string) {
  const match = DOC_TYPES.find(([pattern]) => pattern.test(title))

  return match?.[1] ?? 'Other'
}

function searchLevel(level: JurisdictionLevel) {
  return new Pipeline({
    id: `find-documents-${level}`,
    name: `Find Documents: ${level}`,
    inputSchema: QuerySchema,
  }).step({
    id: `search-${level}`,
    run: async ({ input }): Promise<LevelResults> => {
      if (!input.inScope) return null

      const response = await getClient().search(input.phrases[level], {
        searchDepth: 'basic',
        maxResults: 5,
        includeDomains: SOURCE_DOMAINS[level],
        includeDomainsMode: 'restrict',
      })

      return response.results.map((result) => ({
        title: result.title,
        sourceUrl: result.url,
        excerpt: result.content,
        credibility: credibilityOf(result.url),
        jurisdictionLevel: level,
        docType: docTypeOf(result.title),
      }))
    },
  })
}

function groupLevels(outputs: Record<JurisdictionLevel, LevelResults>): DocumentsResult {
  const skipped = LEVELS.every((level) => outputs[level] === null)

  if (skipped) return { status: 'out_of_scope', reply: OUT_OF_SCOPE_REPLY }

  return {
    status: 'found',
    levels: {
      national: outputs.national ?? [],
      province: outputs.province ?? [],
      city: outputs.city ?? [],
    },
  }
}

export function createFindDocumentsPipeline(
  options: { observability?: PipelineObservabilityOptions } = {},
) {
  return new Pipeline({
    id: 'find-documents',
    name: 'Find Documents',
    inputSchema: z.string().trim().min(1),
    observability: options.observability,
  })
    .extract({
      id: 'read-query',
      model: getModel(),
      outputSchema: QuerySchema,
      instructions: READ_QUERY_INSTRUCTIONS,
      text: ({ input }) => input,
    })
    .parallel({
      id: 'search-levels',
      branches: {
        national: searchLevel('national'),
        province: searchLevel('province'),
        city: searchLevel('city'),
      },
    })
    .step({
      id: 'group-levels',
      run: ({ input }) => groupLevels(input),
    })
}
