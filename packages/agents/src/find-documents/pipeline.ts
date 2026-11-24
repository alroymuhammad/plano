import { Pipeline } from '@anvia/core/pipeline'
import { z } from 'zod'
import { getClient } from '../tools/web-search/service'
import {
  type DocumentResult,
  type DocumentsResult,
  type FindDocumentsOptions,
  type QueryUnderstanding,
  QueryUnderstandingSchema,
} from '../types'
import { getModel } from '../utils/model'
import { checkDownloadLinks } from './download-check'
import { mergeDuplicates } from './merge'
import {
  credibilityOf,
  docTypeOf,
  isListingUrl,
  levelOf,
  numberYearOf,
  searchPhraseOf,
  SOURCE_DOMAINS,
} from './source-map'

const OUT_OF_SCOPE_REPLY =
  'Find Documents only covers Surabaya development and permit documents. Ask about a Surabaya Case, or use web search for other topics.'

const READ_QUERY_INSTRUCTIONS = `You read an Analyst's question about planning and permit documents in Indonesia.
- inScope: true when the question asks for development or permit documents (for example izin pembangunan, bangunan gedung, tata ruang) and names Surabaya or no city. Surabaya is the only supported city. False for any other city and for off-topic questions.
- city and province: "Surabaya" and "Jawa Timur" for an in-scope question. Otherwise the names the question gives.
- topic: the subject in a few words.
- documentTypes: the abbreviation of each regulation type that the search phrases name: Undang-Undang is UU, Peraturan Pemerintah is PP, Peraturan Presiden is Perpres, Peraturan Menteri is Permen, Peraturan Daerah is Perda, Peraturan Wali Kota is Perwali and Peraturan Gubernur is Pergub. An in-scope question always has at least one. Empty when inScope is false.
- searchPhrases: one short Indonesian search phrase per level, using official document vocabulary plus the topic. National: Undang-Undang or Peraturan Pemerintah plus the topic. Province: "Peraturan Daerah Jawa Timur" plus one or two title words, such as "bangunan gedung". City: "Peraturan Wali Kota Surabaya" plus the topic. Use empty strings when inScope is false.
Return only the fields in the schema.`

// A hit is one search result before its level is known.
type Hit = { title: string; sourceUrl: string; excerpt: string }

type Hits = Hit[] | null

function hitsOf(results: Array<{ title: string; url: string; content: string }>): Hit[] {
  return results.map((result) => ({
    title: result.title,
    sourceUrl: result.url,
    excerpt: result.content,
  }))
}

// Each search asks for five results. A search with domains returns results from those sites only.
async function restrictedHits(query: string, domains: string[]): Promise<Hit[]> {
  const response = await getClient().search(query, {
    searchDepth: 'basic',
    maxResults: 5,
    includeDomains: domains,
    includeDomainsMode: 'restrict',
  })

  return hitsOf(response.results)
}

// No domain limit, so any site can answer.
async function openWebHits(query: string): Promise<Hit[]> {
  const response = await getClient().search(query, { searchDepth: 'basic', maxResults: 5 })

  return hitsOf(response.results)
}

// A search branch makes no search call for an out-of-scope question.
function searchBranch(name: string, search: (understanding: QueryUnderstanding) => Promise<Hit[]>) {
  return new Pipeline({
    id: `find-documents-${name}`,
    name: `Find Documents: ${name}`,
    inputSchema: QueryUnderstandingSchema,
  }).step({
    id: `search-${name}`,
    run: async ({ input }): Promise<Hits> => {
      if (!input.inScope) return null

      return search(input)
    },
  })
}

function nationalBranch() {
  // One search per portal, so one busy portal cannot take every national result.
  return searchBranch('national', async ({ searchPhrases }) => {
    const hits = await Promise.all(
      SOURCE_DOMAINS.national.map((domain) => restrictedHits(searchPhrases.national, [domain])),
    )

    return hits.flat()
  })
}

function provinceBranch() {
  return searchBranch('province', ({ searchPhrases }) =>
    restrictedHits(searchPhraseOf('province', searchPhrases.province), SOURCE_DOMAINS.province),
  )
}

function cityBranch() {
  return searchBranch('city', ({ searchPhrases }) =>
    restrictedHits(searchPhrases.city, SOURCE_DOMAINS.city),
  )
}

// The open web takes the city phrase. Its results keep the credibility their host earns.
function openWebBranch() {
  return searchBranch('open-web', ({ searchPhrases }) => openWebHits(searchPhrases.city))
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

function groupLevels({
  understanding,
  results,
}: {
  understanding: QueryUnderstanding
  results: DocumentResult[]
}): DocumentsResult {
  if (!understanding.inScope) {
    return { status: 'out_of_scope', reply: OUT_OF_SCOPE_REPLY, understanding }
  }

  return {
    status: 'found',
    levels: {
      national: results.filter((result) => result.jurisdictionLevel === 'national'),
      province: results.filter((result) => result.jurisdictionLevel === 'province'),
      city: results.filter((result) => result.jurisdictionLevel === 'city'),
    },
    understanding,
  }
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
      model: getModel(),
      outputSchema: QueryUnderstandingSchema,
      instructions: READ_QUERY_INSTRUCTIONS,
      text: ({ input }) => input,
    })
    .parallel({
      id: 'search',
      branches: {
        national: nationalBranch(),
        province: provinceBranch(),
        city: cityBranch(),
        openWeb: openWebBranch(),
        understanding: understandingBranch(),
      },
    })
    .step({
      id: 'collect',
      run: ({ input }) => {
        const { understanding, ...searches } = input
        const hits = Object.values(searches).flatMap((found) => found ?? [])

        return { understanding, hits }
      },
    })
    .step({
      id: 'assign-levels',
      run: ({ input }) => ({
        understanding: input.understanding,
        results: input.hits.flatMap((hit) => {
          if (isListingUrl(hit.sourceUrl)) return []

          const jurisdictionLevel = levelOf(hit.title, hit.sourceUrl)

          if (jurisdictionLevel === null) return []

          return {
            title: hit.title,
            sourceUrl: hit.sourceUrl,
            excerpt: hit.excerpt,
            credibility: credibilityOf(hit.sourceUrl),
            jurisdictionLevel,
            docType: docTypeOf(hit.title),
            ...numberYearOf(hit.title, hit.sourceUrl),
            alternateUrls: [],
          }
        }),
      }),
    })
    .step({
      id: 'merge-duplicates',
      run: ({ input }) => ({
        understanding: input.understanding,
        results: mergeDuplicates(input.results),
      }),
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
