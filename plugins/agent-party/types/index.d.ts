export type Theme = 'party' | 'wizarding'
export type Size = 'auto' | 'large' | 'medium' | 'small' | 'line'
export type Outline = 'thin' | 'dark' | 'none'

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
  errors: number // tool calls that came back as errors: each one costs a heart
  hurtAt?: number
  seenAt: number // last sign of life: a tool call started or ended, or a model step
  inFlight: number // tool calls still running: a long test run is busy, not stuck
  lastCall: string // the latest tool call with its input, to spot the same call over and over
  repeats: number
  parentId?: string // the agent that spawned this one, when an agent did
  files: string[] // files it edited or wrote
  tests: number // test suites it ran
}

declare module 'claude-code' {
  interface PluginState {
    'agent-party': {
      agents: Agent[]
      isVoiceOn: boolean
      theme: Theme
      size: Size
      outline: Outline
      cast: Record<string, string> // agent type → role, set with /agent-cast
      log: Agent[] // finished quests, newest last: what /agent-log shows after the heroes leave
    }
  }
}
