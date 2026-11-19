import { Agent } from '@anvia/core'
import { OpenAIClient } from '@anvia/openai'

const client = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY! })

export const assistant = new Agent({
  id: 'assistant',
  model: client.completionModel({ modelId: 'gpt-5.6-sol', api: 'responses' }),
  instructions: 'Be concise and friendly.',
  maxTurns: 4,
})
