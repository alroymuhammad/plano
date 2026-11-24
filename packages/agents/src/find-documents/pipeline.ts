import { Pipeline } from '@anvia/core/pipeline'
import { z } from 'zod'
import { getClient } from '../tools/web-search/service'
import {
  type DocumentResult,
  type DocumentsResult,
  type FindDocumentsOptions,
  type JurisdictionLevel,
  type QueryUnderstanding,
  QueryUnderstandingSchema,
} from '../types'
import { getModel } from '../utils/model'
import { checkDownloadLinks } from './download-check'
import { credibilityOf, docTypeOf, LEVELS, SOURCE_DOMAINS } from './source-map'

const OUT_OF_SCOPE_REPLY =
  'Find Documents only covers Surabaya development and permit documents. Ask about a Surabaya Case, or use web search for other topics.'

const READ_QUERY_INSTRUCTIONS = `You read an Analyst's question about planning and permit documents in Indonesia.
- inScope: true when the question asks for development or permit documents (for example izin pembangunan, bangunan gedung, tata ruang) and names Surabaya or no city. Surabaya is the only supported city. False for any other city and for off-topic questions.
- city and province: "Surabaya" and "Jawa Timur" for an in-scope question. Otherwise the names the question gives.
- topic: the subject in a few words.
- documentTypes: the abbreviation of each regulation type that the search phrases name: Undang-Undang is UU, Peraturan Pemerintah is PP, Peraturan Presiden is Perpres, Peraturan Menteri is Permen, Peraturan Daerah is Perda, Peraturan Wali Kota is Perwali and Peraturan Gubernur is Pergub. An in-scope question always has at least one. Empty when inScope is false.
- searchPhrases: one short Indonesian search phrase per level, using official document vocabulary plus the topic. National: Undang-Undang or Peraturan Pemerintah plus the topic. Province: "Peraturan Daerah Jawa Timur" plus one or two title words, such as "bangunan gedung". Leave "izin" and "perizinan" out of the province phrase, because the Jawa Timur index returns nothing for them. City: "Peraturan Wali Kota Surabaya" plus the topic. Use empty strings when inScope is false.
Return only the fields in the schema.`

type LevelResults = DocumentResult[] | null

function searchLevel(level: JurisdictionLevel, options: FindDocumentsOptions) {
  return new Pipeline({
    id: `find-documents-${level}`,
    name: `Find Documents: ${level}`,
    inputSchema: QueryUnderstandingSchema,
  }).step({
    id: `search-${level}`,
    run: async ({ input }): Promise<LevelResults> => {
      if (!input.inScope) return null

      const response = await getClient().search(input.searchPhrases[level], {
        searchDepth: 'basic',
        maxResults: 5,
        includeDomains: SOURCE_DOMAINS[level],
        includeDomainsMode: 'restrict',
      })

      options.onSearch?.(
        level,
        response.results.map((result) => result.url),
      )

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

function understandingBranch() {
  return new Pipeline({
    id: 'find-documents-understanding',
    name: 'Find Documents: understanding',
    inputSchema: QueryUnderstandingSchema,
  }).step({
    id: 'understanding',
    run: ({ input }) => input,
  })
}

function groupLevels(
  outputs: Record<JurisdictionLevel, LevelResults> & { understanding: QueryUnderstanding },
): DocumentsResult {
  const { understanding } = outputs
  const skipped = LEVELS.every((level) => outputs[level] === null)

  if (skipped) return { status: 'out_of_scope', reply: OUT_OF_SCOPE_REPLY, understanding }

  return {
    status: 'found',
    levels: {
      national: outputs.national ?? [],
      province: outputs.province ?? [],
      city: outputs.city ?? [],
    },
    understanding,
  }
}

function withUsage(model: ReturnType<typeof getModel>, onUsage: FindDocumentsOptions['onUsage']) {
  if (!onUsage) return model

  return new Proxy(model, {
    get(target, property) {
      if (property === 'completion') {
        return async (...args: Parameters<typeof target.completion>) => {
          const response = await target.completion(...args)

          onUsage(response.usage)
          return response
        }
      }

      const value = Reflect.get(target, property, target)

      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

export function createFindDocumentsPipeline(options: FindDocumentsOptions = {}) {
  return new Pipeline({
    id: 'find-documents',
    name: 'Find Documents',
    inputSchema: z.string().trim().min(1),
    observability: options.observability,
  })
    .extract({
      id: 'read-query',
      model: withUsage(getModel(), options.onUsage),
      outputSchema: QueryUnderstandingSchema,
      instructions: READ_QUERY_INSTRUCTIONS,
      text: ({ input }) => input,
    })
    .parallel({
      id: 'search-levels',
      branches: {
        national: searchLevel('national', options),
        province: searchLevel('province', options),
        city: searchLevel('city', options),
        understanding: understandingBranch(),
      },
    })
    .step({
      id: 'group-levels',
      run: ({ input }) => groupLevels(input),
    })
    .step({
      id: 'check-download-links',
      run: ({ input, abortSignal }) => checkDownloadLinks(input, { abortSignal }),
    })
}
