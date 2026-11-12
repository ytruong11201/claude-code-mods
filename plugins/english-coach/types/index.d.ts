/** The prompt being coached; `feedback` is null while the coach is working. */
export type Coaching = { original: string; feedback: string | null }

export type HistoryItem = { t: number; original: string; feedback: string }

declare module 'claude-code' {
  interface PluginState {
    'english-coach': { latest: Coaching | null; isHidden: boolean }
  }
}
