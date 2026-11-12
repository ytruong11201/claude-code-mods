import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Coaching, HistoryItem } from '../types'

const latest = atom({ plugin: 'english-coach', key: 'latest' } as const, null)
const isHidden = atom({ plugin: 'english-coach', key: 'isHidden' } as const, false)

const MIN_WORDS = 6
const HISTORY_MAX = 300
const REVIEW_ITEMS = 60

const COACH = `You are an English writing coach for a Vietnamese software engineer.
Target: B2 -> C1, natural workplace English (remote team, Slack, PR reviews, standups).
The input is a prompt they typed to an AI coding assistant.
Rules:
- Ignore code, file paths, identifiers, logs and technical correctness. Judge the English only.
- Keep their meaning and intent. Do not make it longer or more formal than a native engineer would.
- If the English is already natural, reply exactly: OK
- Otherwise reply with at most 3 lines, no preamble, no markdown:
  ✎ <natural rewrite: how a native engineer would type it>
  ↑ <C1 version: more precise vocabulary or structure; omit this line if not meaningfully different>
  💡 <ONE takeaway: "their phrase" → "better phrase" — why, max 15 words>
- If the input is mostly Vietnamese: reply "✎ <natural English version>" and "💡 <one useful phrase from it>".`

const REVIEW = `You review an English learner's coaching history (JSON list of {original, feedback}).
Reply in concise Markdown:
1. Top 3 recurring mistake patterns, each with one real example from the history and the fix.
2. Five high-value phrases they should start using, each with a short example.
3. A 5-question drill: rewrite 5 of their own past sentences naturally. Answers at the end.`

// ponytail: regex heuristics, not a parser; a prose line that starts like a shell command is dropped too.
const SHELL = /^\s*(?:[$%#>]\s|(?:sudo|git|npm|npx|pnpm|yarn|bun|node|python3?|pip|cd|ls|grep|curl|docker|kubectl|cargo|dotnet|claude)\s)/
const LOG =
  /^\s*(?:at\s+\S+.*[:(]\d+|File ".*", line \d+|Traceback\b|\w*(?:Error|Exception)\b:|\[?(?:INFO|WARN|WARNING|ERROR|DEBUG|TRACE|FATAL)\]?\b|\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}|\d{2}:\d{2}:\d{2})/

function clean(text: string): string {
  return text
    .replace(/(```|~~~)[\s\S]*?(?:\1|$)/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .split('\n')
    .filter(line => !SHELL.test(line) && !LOG.test(line))
    .join('\n')
    .replace(/\S*[\\/]\S*/g, ' ') // paths and URLs
    .replace(/\b[\w-]{2,}\.[A-Za-z0-9]{1,6}\b/g, ' ') // file.ext
    .replace(/[ \t]+/g, ' ')
    .trim()
}

const words = (text: string) => text.split(/\s+/).filter(w => /\p{L}/u.test(w)).length

/** Sets `latest` only while it is still this prompt's, so a slow reply never covers a newer one. */
const settle = ($: EngineInterface, original: string, next: Coaching | null) =>
  update($, latest, cur => (cur?.original === original ? next : cur))

async function coach($: EngineInterface, original: string) {
  try {
    if ((await $.store.get('enabled')) === false) return
    await update($, isHidden, () => false)
    await update($, latest, () => ({ original, feedback: null }))

    const r = await $.model.complete({
      model: 'haiku',
      system: COACH,
      prompt: original.slice(0, 4000),
      effort: 'low',
      maxTokens: 300,
      timeoutMs: 20000,
    })
    const feedback = r.isAnswered ? r.text.trim() : ''
    if (!feedback || /^OK\.?$/i.test(feedback)) return void (await settle($, original, null))

    await settle($, original, { original, feedback })
    $.ui.log(`english-coach\n${feedback}`)
    const t = await $.clock.now()
    const history = ((await $.store.get('history')) ?? []) as HistoryItem[]
    await $.store.set('history', [...history, { t, original, feedback }].slice(-HISTORY_MAX))
  } catch {
    await settle($, original, null).catch(() => {})
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'english-coach',
        description: 'Turn English coaching on or off',
        argumentHint: '[on|off]',
        immediate: true,
      })
      await $.command.register({
        name: 'english-review',
        description: 'Review your recent English mistakes and what to practise',
        immediate: true,
      })
    } catch (err) {
      $.ui.log(`english-coach: commands not registered: ${err}`, { to: 'debug' })
    }
    return next(e)
  })

  // Observe only: the prompt goes on untouched and at once; the coach runs later, off this dispatch.
  on('prompt.submit', ($, e, next) => {
    if (!e.command && !e.isMeta) {
      const text = clean(e.text)
      if (words(text) >= MIN_WORDS) $.clock.after(0, () => void coach($, text))
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'english-coach' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const wasOn = (await $.store.get('enabled')) !== false
    const isOn = arg === 'on' ? true : arg === 'off' ? false : !wasOn
    await $.store.set('enabled', isOn)
    if (!isOn) await update($, latest, () => null)
    $.ui.toast(`english-coach ${isOn ? 'on' : 'off'}`)
    return {}
  })

  on('command.run', { command: 'english-review' }, async $ => {
    const history = ((await $.store.get('history')) ?? []) as HistoryItem[]
    if (history.length === 0) {
      $.ui.toast('english-coach: no history to review yet')
      return {}
    }
    $.ui.toast('english-coach: reviewing your recent prompts…')
    const items = history.slice(-REVIEW_ITEMS).map(({ original, feedback }) => ({ original, feedback }))
    const r = await $.model.complete({
      model: 'sonnet',
      system: REVIEW,
      prompt: JSON.stringify(items),
      maxTokens: 1500,
      timeoutMs: 90000,
    })
    $.ui.log(r.isAnswered ? `✎ english-review\n${r.text.trim()}` : `english-review failed: ${r.reason}`)
    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const cur = await read($, latest)
    if (cur === null || (await read($, isHidden))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    if (cur.feedback === null) {
      return <Text dimColor>✎ english-coach: rewriting your prompt…</Text>
    }
    return (
      <Box flexDirection="column">
        <Text dimColor>english-coach</Text>
        <Text>{cur.feedback}</Text>
        <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
