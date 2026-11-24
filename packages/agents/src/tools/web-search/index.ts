import { createTool } from '@anvia/core'
import { z } from 'zod'
import { searchWeb } from './service'

export function createWebSearchTool(maxCalls = Infinity) {
  let calls = 0

  return createTool({
    name: 'webSearch',
    description:
      'Search the public web. Returns a short answer and the top results with source URLs.',
    inputSchema: z.object({
      query: z.string().trim().min(1),
    }),
    handler: ({ query }) => {
      if (calls >= maxCalls)
        return `Search limit of ${maxCalls} reached. Answer with what you have.`

      calls++
      return searchWeb(query)
    },
  })
}

export const webSearchTool = createWebSearchTool()
