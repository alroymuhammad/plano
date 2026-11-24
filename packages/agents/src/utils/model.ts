import { OpenAIClient } from '@anvia/openai'

export const DEFAULT_MODEL = 'deepseek-v4.1-flash-1017'
export const JUDGE_MODEL = 'gpt-6-luna'

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) throw new Error(`Set ${name} before running an agent`)

  return value
}

export function getModel(modelId = DEFAULT_MODEL) {
  const client = new OpenAIClient({
    apiKey: requireEnv('GATEWAY_API_KEY'),
    baseUrl: requireEnv('GATEWAY_BASE_URL'),
  })
  return client.completionModel({ modelId, api: 'chat' })
}
