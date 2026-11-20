import { createTool } from '@anvia/core'
import { z } from 'zod'
import { searchWeb } from './service'

export const webSearchTool = createTool({
  name: 'webSearch',
  description:
    'Search the public web. Returns a short answer and the top results with source URLs.',
  inputSchema: z.object({
    query: z.string().trim().min(1),
  }),
  handler: ({ query }) => searchWeb(query),
})
