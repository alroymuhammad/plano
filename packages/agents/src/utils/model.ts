import { AnthropicClient } from '@anvia/anthropic'
import { OpenAIClient } from '@anvia/openai'
import type { Provider } from '../types'

export const DEFAULT_MODEL = 'deepseek-v4.1-flash-1017'
export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5'

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) throw new Error(`Set ${name} before running an agent`)

  return value
}

export function getModel(provider: Provider = 'openai', modelId?: string) {
  if (provider === 'anthropic') {
    const client = new AnthropicClient({
      apiKey: process.env.ANTHROPIC_API_KEY ?? requireEnv('GATEWAY_API_KEY'),
      baseUrl: process.env.ANTHROPIC_BASE_URL ?? process.env.GATEWAY_BASE_URL,
    })
    return client.completionModel({ modelId: modelId ?? DEFAULT_ANTHROPIC_MODEL })
  }

  const client = new OpenAIClient({
    apiKey: requireEnv('GATEWAY_API_KEY'),
    baseUrl: requireEnv('GATEWAY_BASE_URL'),
  })
  return client.completionModel({ modelId: modelId ?? DEFAULT_MODEL, api: 'chat' })
}
