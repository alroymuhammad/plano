import { createTool } from '@anvia/core'
import { z } from 'zod'
import type { SearchLibraryOptions } from '../../types'
import { searchLibrary } from './service'

const DEFAULT_TOP_K = 8
const MAX_TOP_K = 20

// Created for one Analyst, so every search stays in that Analyst's Library. That is why it is not in the default tool list.
export function createSearchLibraryTool(analystId: string, options: SearchLibraryOptions = {}) {
  return createTool({
    name: 'searchLibrary',
    description:
      "Search the Analyst's Library of confirmed, active planning documents. Returns the best matching Passages, each with its document, pages, heading, and a verbatim quote.",
    inputSchema: z.object({
      query: z
        .string()
        .trim()
        .min(1)
        .describe('What to find, as a question or keywords, in the language of the documents'),
      documentIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .optional()
        .describe(
          'Limit the search to these document IDs. A document ID is the part of a passageId before its colon. Leave out to search every document',
        ),
      topK: z
        .number()
        .int()
        .min(1)
        .max(MAX_TOP_K)
        .optional()
        .describe(`How many Passages to return, 1 to ${MAX_TOP_K}. Leave out for ${DEFAULT_TOP_K}`),
    }),
    handler: ({ query, documentIds, topK = DEFAULT_TOP_K }, { abortSignal }) =>
      searchLibrary({ ...options, analystId, query, documentIds, topK, abortSignal }),
  })
}
