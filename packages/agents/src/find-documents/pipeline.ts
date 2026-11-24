import { Agent } from '@anvia/core'
import { Pipeline } from '@anvia/core/pipeline'
import { webSearchTool } from '../tools/web-search'
import {
  ClarificationSchema,
  DocumentsResultSchema,
  FindDocumentsInputSchema,
  type FindDocumentsOptions,
  SearchResultsSchema,
} from '../types'
import { getModel } from '../utils/model'

const CLARIFY_INSTRUCTIONS = `You help an analyst find development and permit documents in Indonesia.
Read the request. Use webSearch, at most 4 times, to learn which rules apply to it in the user's city: national laws and regulations, the province's regulations, and the city's regulations.
Return the request in one sentence, the city and its province, and each rule with its level and why it applies. Name rules by their official type, number and year when you know them.`

const SEARCH_INSTRUCTIONS = `You find the documents for a list of rules.
Use webSearch, at most 8 times, to find the rules. Prefer official sites: peraturan.go.id, peraturan.bpk.go.id, jdih sites of the ministry, province or city. Add "pdf" to a query to find the file.
Return only documents whose URL appears in a search result. Never write a URL yourself. pdfUrl is a result URL that ends in .pdf or is a download link, otherwise null.`

const ANSWER_INSTRUCTIONS = `You answer an analyst's request for development and permit documents.
From the found documents, keep only the ones relevant to the request, most important first. Copy each url and pdfUrl exactly. Never add a document or URL that is not in the found documents.`

export function createFindDocumentsPipeline(options: FindDocumentsOptions = {}) {
  const clarify = new Agent({
    id: 'find-documents-clarify',
    name: 'Clarify rules',
    model: getModel(),
    instructions: CLARIFY_INSTRUCTIONS,
    tools: [webSearchTool],
    outputSchema: ClarificationSchema,
    maxTurns: 6,
  })

  const search = new Agent({
    id: 'find-documents-search',
    name: 'Search documents',
    model: getModel(),
    instructions: SEARCH_INSTRUCTIONS,
    tools: [webSearchTool],
    outputSchema: SearchResultsSchema,
    maxTurns: 10,
  })

  return new Pipeline({
    id: 'find-documents',
    name: 'Find Documents',
    inputSchema: FindDocumentsInputSchema,
    observability: options.observability,
  })
    .agent({
      id: 'clarify',
      agent: clarify,
      suspension: 'reject',
      request: ({ input }) => ({ prompt: input.findDocumentPrompt }),
    })
    .agent({
      id: 'search',
      agent: search,
      suspension: 'reject',
      request: ({ input }) => ({ prompt: JSON.stringify(input) }),
    })
    .extract({
      id: 'answer',
      model: getModel(),
      outputSchema: DocumentsResultSchema,
      instructions: ANSWER_INSTRUCTIONS,
      text: ({ input }) => JSON.stringify(input),
    })
}
