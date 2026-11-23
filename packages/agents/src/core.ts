import { Agent, type AgentPrompt, type MemoryScope, type MemoryStore } from '@anvia/core'
import { BASE_INSTRUCTION } from './instruction'
import { tools } from './tools/tools'
import { getModel, type Provider } from './utils/model'

export type RunAgentOptions = {
  prompt: AgentPrompt
  provider?: Provider
  modelId?: string
  memory?: MemoryStore
  session?: MemoryScope
}

export function runAgent({ prompt, provider, modelId, memory, session }: RunAgentOptions) {
  const agent = new Agent({
    id: 'assistant',
    model: getModel(provider, modelId),
    instructions: BASE_INSTRUCTION,
    tools,
    memory: memory && { store: memory, savePolicy: 'turn' },
    maxTurns: 75,
  })
  return agent.stream({ prompt, session })
}
