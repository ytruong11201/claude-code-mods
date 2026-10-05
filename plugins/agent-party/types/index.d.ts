export type Theme = 'party' | 'wizarding'

export type Agent = {
  id: string
  type: string
  title: string
  activity: string
  startedAt: number
  endedAt?: number
  context: number
  calls: number
  status: 'running' | 'done' | 'failed'
}

declare module 'claude-code' {
  interface PluginState {
    'agent-party': { agents: Agent[]; isVoiceOn: boolean; theme: Theme }
  }
}
