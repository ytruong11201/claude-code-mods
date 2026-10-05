import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Agent } from '../types'
import { THEMES } from './heroes'
import type { Theme } from './heroes'
import { describe, elapsed, spoken, tokens } from './activity'
import { TICK_MS } from './art'
import { classOf, colorOf, COLUMNS, ROWS, spriteCells } from './sprites'

const agents = atom({ plugin: 'agent-party', key: 'agents' } as const, [] as Agent[])
const isVoiceOn = atom({ plugin: 'agent-party', key: 'isVoiceOn' } as const, true)
const theme = atom({ plugin: 'agent-party', key: 'theme' } as const, 'party' as Theme)

const LINGER_MS = 20_000 // a finished agent stays on stage this long
const CHATTER_MS = 45_000 // at most one spoken activity update per agent this often
const BUBBLE = 30

// WHY: hooks only queue lines; the session.start timer speaks them, so no tool call waits on a voice.
const speech: string[] = []
const spokenAt = new Map<string, number>()
let isSpeaking = false
let useSpdSay = false

const say = (text: string, isImportant = false) => {
  if (!isImportant && speech.length >= 2) return
  speech.push(text)
  if (speech.length > 4) speech.shift()
}

const speakNext = async ($: EngineInterface) => {
  const text = speech.shift()
  if (!text || !(await read($, isVoiceOn))) return
  isSpeaking = true
  try {
    if (!useSpdSay) await $.audio.speak(text)
    else await $.process.run(['spd-say', '-w', text], { timeoutMs: 30_000 })
  } catch (err) {
    if (useSpdSay) {
      await update($, isVoiceOn, () => false)
      $.ui.toast(`agent-party: no voice available (${String(err).slice(0, 80)}), voice off`)
    } else {
      useSpdSay = true // ponytail: Linux fallback when the engine has no synthesizer; one retry, then voice off
      speech.unshift(text)
    }
  } finally {
    isSpeaking = false
  }
}

const patch = ($: EngineInterface, id: string, fn: (agent: Agent) => Agent) =>
  update($, agents, list => list.map(agent => (agent.id === id ? fn(agent) : agent)))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agent-voice', description: 'Turn the agent-party voice on or off' })
    await $.command.register({ name: 'agent-theme', description: 'Switch the cast: party (fantasy RPG) or wizarding (wizarding school)' })
    const saved = await $.store.get('theme')
    if (THEMES.includes(saved as Theme)) await update($, theme, () => saved as Theme)
    $.clock.every(TICK_MS, () => {
      void (async () => {
        const now = await $.clock.now()
        const list = await read($, agents)
        const kept = list.filter(agent => !agent.endedAt || now - agent.endedAt < LINGER_MS)
        if (kept.length !== list.length) await update($, agents, () => kept)
        if (kept.length) $.ui.invalidate('ui.render')
        if (!isSpeaking && speech.length) await speakNext($)
      })()
    })
    return next(e)
  })

  on('command.run', { command: 'agent-theme' }, async ($, e) => {
    const asked = e.args.trim()
    const current = await read($, theme)
    const next = asked ? (asked as Theme) : THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]!
    if (!THEMES.includes(next)) return { text: `Unknown theme "${asked}". Use ${THEMES.join(' | ')}.` }
    await update($, theme, () => next)
    await $.store.set('theme', next) // WHY: the cast is a preference, so it outlives the session
    return { text: `agent-party theme: ${next}` }
  })

  on('command.run', { command: 'agent-voice' }, async $ => {
    const isOn = await update($, isVoiceOn, value => !value)
    if (!isOn) speech.length = 0
    return { text: `agent-party voice ${isOn ? 'on' : 'off'}` }
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (!started.agentId) return started
    const type = e.subagentType || 'general-purpose'
    const agent: Agent = {
      id: started.agentId,
      type,
      title: e.description,
      activity: 'Getting started…',
      startedAt: await $.clock.now(),
      context: 0,
      calls: 0,
      status: 'running',
    }
    await update($, agents, list => [...list.filter(one => one.id !== agent.id), agent])
    say(`${spoken(type)} started: ${e.description}`, true)
    return started
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (id && (await read($, agents)).some(agent => agent.id === id)) {
      const agent = (await read($, agents)).find(one => one.id === id)!
      const activity = describe(e.tool, e as unknown as Record<string, unknown>)
      await patch($, id, one => ({ ...one, activity, calls: one.calls + 1 }))
      const now = await $.clock.now()
      if (now - (spokenAt.get(id) ?? 0) > CHATTER_MS) {
        spokenAt.set(id, now)
        say(`${spoken(agent.type)}: ${activity}`)
      }
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const step = yield* next(e)
    const usage = step.usage
    if (e.agentId && usage) {
      const context = usage.input_tokens + usage.cache_read_input_tokens + (usage.cache_creation_input_tokens ?? 0)
      await patch($, e.agentId, one => ({ ...one, context: context + usage.output_tokens }))
    }
    return step
  })

  on('turn.complete', async ($, e, next) => {
    const id = e.agentId
    const agent = id ? (await read($, agents)).find(one => one.id === id && !one.endedAt) : undefined
    if (agent && id) {
      const isFailed = e.isAborted || e.reason === 'refusal'
      const now = await $.clock.now()
      await patch($, id, one => ({
        ...one,
        status: isFailed ? 'failed' : 'done',
        activity: isFailed ? 'Stopped ✗' : 'Done ✓',
        endedAt: now,
      }))
      say(`${spoken(agent.type)} ${isFailed ? 'stopped' : 'finished'}: ${agent.title}`, true)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, agents)
    if (!list.length || e.props.hasSurvey) return next(e)

    const table = $.ui.resolve(e)
    const { Box, Text } = table
    const Raster = 'Raster' in table ? table.Raster : undefined
    const now = await $.clock.now()
    const tick = Math.floor(now / TICK_MS)
    const cast = await read($, theme)

    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={3}>
        {list.map(agent => {
          const mode = agent.status === 'running' ? 'work' : agent.status === 'done' ? 'done' : 'failed'
          const age = Math.floor((now - agent.startedAt) / TICK_MS)
          const sinceEnd = agent.endedAt ? Math.floor((now - agent.endedAt) / TICK_MS) : undefined
          const tone = agent.status === 'failed' ? 'red' : agent.status === 'done' ? 'green' : colorOf(agent.type, cast)
          return (
            <Box flexDirection="row" gap={1}>
              {Raster ? (
                <Raster key={`sprite-${agent.id}`} columns={COLUMNS} rows={ROWS} cells={spriteCells(agent.type, mode, tick, age, sinceEnd, cast)} />
              ) : (
                <Text>{agent.status === 'running' ? '🧙' : agent.status === 'done' ? '🏆' : '💤'}</Text>
              )}
              <Box flexDirection="column" width={BUBBLE + 4}>
                <Text wrap="truncate">
                  <Text bold color={colorOf(agent.type, cast)}>{agent.type}</Text>
                  <Text dimColor> the {classOf(agent.type, cast)} · Lv {agent.calls + 1}</Text>
                </Text>
                <Box flexDirection="column" borderStyle="round" borderColor={tone} paddingX={1}>
                  <Text bold wrap="truncate">{agent.title}</Text>
                  <Text italic color={agent.status === 'running' ? undefined : tone} wrap="truncate">
                    {agent.activity}
                  </Text>
                </Box>
                <Text dimColor wrap="truncate">
                  {' '}⏱ {elapsed((agent.endedAt ?? now) - agent.startedAt)}
                  {agent.context ? ` · ↓ ${tokens(agent.context)} tokens` : ''}
                </Text>
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  })
}
