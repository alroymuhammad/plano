import { Agent, type AgentPrompt } from '@anvia/core'
import { BASE_INSTRUCTION } from './instruction'
import { tools } from './tools/tools'
import { getModel, type Provider } from './utils/model'

export type RunAgentOptions = {
  prompt: AgentPrompt
  provider?: Provider
  modelId?: string
}

export function runAgent({ prompt, provider, modelId }: RunAgentOptions) {
  const agent = new Agent({
    id: 'assistant',
    model: getModel(provider, modelId),
    instructions: BASE_INSTRUCTION,
    tools,
    memory: undefined,
    maxTurns: 75,
  })
  return agent.stream({ prompt })
}
