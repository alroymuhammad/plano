import { generateCompletion } from '@anvia/core'
import { Pipeline } from '@anvia/core/pipeline'
import { runAgent } from '../core'
import {
  DocumentsResultSchema,
  FindDocumentsInputSchema,
  type FindDocumentsOptions,
} from '../types'
import { getModel } from '../utils/model'

const CLARIFY_INSTRUCTIONS = `You help an analyst find development and permit documents in Indonesia.
Read the request. Use webSearch, at most 4 times, to learn which rules apply to it in the user's city: national laws and regulations, the province's regulations, and the city's regulations.
List the city and its province, then each rule with its level (national, province or city) and why it applies. Name rules by their official type, number and year when you know them. If you can't name a rule for a level, say which kind of rule to look for there, for example the province's spatial plan (Perda RTRW).`

const SEARCH_INSTRUCTIONS = `You find the documents for a list of rules.
Use webSearch, at most 8 times, to find the rules. Prefer official sites: peraturan.go.id, peraturan.bpk.go.id, jdih sites of the ministry, province or city. Add "pdf" to a query to find the file.
Regional regulations (Perda, Pergub, Perwali) are on peraturan.bpk.go.id. Search there with the region name, for example "Perda Provinsi Jawa Timur bangunan gedung".
For each document found, list its title, level, URL and PDF URL. Only use URLs that appear in a search result; never write a URL yourself. The PDF URL is a result URL that ends in .pdf or is a download link, otherwise none.`

const ANSWER_INSTRUCTIONS = `You answer an analyst's request for development and permit documents.
From the found documents, keep every one that covers part of the permit process (for example permits, building certificates, fees or zoning), most important first. Drop only unrelated documents. Copy each url and pdfUrl exactly, and use null when a document has none. Never add a document or URL that is not in the found documents.`

export function createFindDocumentsPipeline(options: FindDocumentsOptions = {}) {
  return new Pipeline({
    id: 'find-documents',
    name: 'Find Documents',
    inputSchema: FindDocumentsInputSchema,
    observability: options.observability,
  })
    .step({
      id: 'clarify',
      run: async ({ input }) => {
        const rules = await runAgent({
          prompt: input.findDocumentPrompt,
          instructions: CLARIFY_INSTRUCTIONS,
        }).text

        return { request: input.findDocumentPrompt, rules }
      },
    })
    .step({
      id: 'search',
      run: async ({ input }) => {
        const found = await runAgent({
          prompt: `Request: ${input.request}\n\nRules:\n${input.rules}`,
          instructions: SEARCH_INSTRUCTIONS,
        }).text

        return { ...input, found }
      },
    })
    .step({
      id: 'answer',
      run: async ({ input }) => {
        const result = await generateCompletion({
          model: getModel(),
          prompt: `Request: ${input.request}\n\nFound documents:\n${input.found}`,
          instructions: ANSWER_INSTRUCTIONS,
          outputSchema: DocumentsResultSchema,
        })

        return result.output
      },
    })
}
