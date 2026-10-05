const base = (path: unknown): string => String(path ?? '').split('/').pop() || 'a file'
const clip = (text: unknown, n: number): string => {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

// What a tool call reads as in a speech bubble: "Reading product.service.ts".
export const describe = (tool: string, input: Record<string, unknown>): string => {
  switch (tool) {
    case 'Read':
      return `Reading ${base(input.file_path)}`
    case 'Edit':
    case 'NotebookEdit':
      return `Editing ${base(input.file_path ?? input.notebook_path)}`
    case 'Write':
      return `Writing ${base(input.file_path)}`
    case 'Bash':
      return input.description ? clip(input.description, 60) : `Running ${clip(input.command, 40)}`
    case 'Grep':
      return `Searching "${clip(input.pattern, 30)}"`
    case 'Glob':
      return `Finding ${clip(input.pattern, 30)}`
    case 'WebFetch':
      return `Reading ${clip(String(input.url ?? '').replace(/^https?:\/\//, '').split('/')[0], 30)}`
    case 'WebSearch':
      return `Googling "${clip(input.query, 30)}"`
    case 'Agent':
      return `Calling in a ${input.subagent_type ?? 'helper'}`
    case 'TodoWrite':
      return 'Updating the todo list'
    default: {
      const mcp = /^mcp__(.+?)__(.+)$/.exec(tool)
      return mcp ? `Asking ${mcp[1]}: ${mcp[2]!.replace(/_/g, ' ')}` : `Using ${tool}`
    }
  }
}

export const elapsed = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

export const tokens = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

// Spoken name: "code-reviewer" → "code reviewer".
export const spoken = (type: string): string => type.replace(/[-_]/g, ' ')
