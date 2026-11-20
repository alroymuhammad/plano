import { createTool } from '@anvia/core'
import { z } from 'zod'
import { webSearchTool } from './web-search'

export const testingTool = createTool({
  name: 'testing',
  description: 'Use when the user asks to test tools. Returns a fixed confirmation string.',
  inputSchema: z.object({}),
  handler: () => 'tools testing are working',
})

export const tools = [testingTool, webSearchTool]
