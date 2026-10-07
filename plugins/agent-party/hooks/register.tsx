import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderNode } from 'claude-code'

import type { Agent, Outline, Size } from '../types'
import { HEROES, heroOf, roleOf, THEMES } from './heroes'
import type { Theme } from './heroes'
import { describe, elapsed, isTestRun, loot, spoken, tokens } from './activity'
import { frame, TICK_MS } from './art'
import type { Mode } from './art'
import { cellsOf, classOf, colorOf, spriteCells, spriteSvg } from './sprites'

const agents = atom({ plugin: 'agent-party', key: 'agents' } as const, [] as Agent[])
const isVoiceOn = atom({ plugin: 'agent-party', key: 'isVoiceOn' } as const, true)
const theme = atom({ plugin: 'agent-party', key: 'theme' } as const, 'party' as Theme)
const size = atom({ plugin: 'agent-party', key: 'size' } as const, 'auto' as Size)
const outline = atom({ plugin: 'agent-party', key: 'outline' } as const, 'thin' as Outline)
const cast = atom({ plugin: 'agent-party', key: 'cast' } as const, {} as Record<string, string>)
const log = atom({ plugin: 'agent-party', key: 'log' } as const, [] as Agent[])

const LOG_PANE = 'agent-log'
const LOG_KEEP = 100 // ponytail: the session's last 100 quests; page the pane if anyone needs more

const SIZES: Size[] = ['auto', 'large', 'medium', 'small', 'line']
const OUTLINES: Outline[] = ['thin', 'dark', 'none']
const PIXELS = { large: 16, medium: 12, small: 8 } as const

const LINGER_MS = 20_000 // a finished agent stays on stage this long
const CHATTER_MS = 45_000 // at most one spoken activity update per agent this often
const STUCK_MS = 120_000 // no tool running and no model step for this long reads as stuck
const LOOP_REPEATS = 3 // the same tool call with the same input this many times in a row reads as a loop
const HURT_MS = 750 // the red flash after a failed tool call
const MAX_HP = 5
const BUBBLE = 30

// WHY: hooks only queue lines; the session.start timer speaks them, so no tool call waits on a voice.
const speech: string[] = []
const spokenAt = new Map<string, number>()
const warned = new Set<string>() // agents already announced as stuck
let isSpeaking = false
let useSpdSay = false
let shownStatus: string | undefined

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

const isStuck = (agent: Agent, now: number) =>
  agent.status === 'running' && agent.inFlight === 0 && now - agent.seenAt > STUCK_MS

// The status line: the party at a glance on every surface, also when the band is hidden or too narrow.
const summary = (list: Agent[], now: number): string | undefined => {
  if (!list.length) return undefined
  const count = (status: Agent['status']) => list.filter(agent => agent.status === status).length
  const stuck = list.filter(agent => isStuck(agent, now)).length
  return [
    `⚔ ${count('running')} running`,
    count('done') && `✓ ${count('done')} done`,
    count('failed') && `✗ ${count('failed')} stopped`,
    stuck && `💦 ${stuck} stuck?`,
  ].filter(Boolean).join(' · ')
}

// auto: the hero shrinks as the party grows or the window narrows, then goes to one line each.
const sizeFor = (setting: Size, count: number, columns: number): Exclude<Size, 'auto'> => {
  if (setting !== 'auto') return setting
  if (columns < 45 || count > 6) return 'line'
  if (count <= 2 && columns >= 60) return 'large'
  return count <= 4 ? 'medium' : 'small'
}

// /agent-theme, /agent-size, /agent-outline: a name picks, no name steps to the next one.
const pick = <T extends string>(args: string, current: T, options: readonly T[], key: string): { value?: T; text: string } => {
  const asked = args.trim()
  const value = asked ? (asked as T) : options[(options.indexOf(current) + 1) % options.length]!
  return options.includes(value)
    ? { value, text: `agent-party ${key}: ${value}` }
    : { text: `Unknown ${key} "${asked}". Use ${options.join(' | ')}.` }
}

const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T => options.includes(value as T)

const fresh = (now: number) => ({ errors: 0, seenAt: now, inFlight: 0, lastCall: '', repeats: 0, files: [] as string[], tests: 0 })

const hearts = (agent: Agent) => {
  const hp = Math.max(0, MAX_HP - agent.errors)
  return '♥'.repeat(hp) + '♡'.repeat(MAX_HP - hp)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agent-voice', description: 'Turn the agent-party voice on or off' })
    await $.command.register({ name: 'agent-theme', description: 'Switch the cast: party (fantasy RPG) or wizarding (wizarding school)' })
    await $.command.register({ name: 'agent-size', description: 'Hero size: auto, large (16×16), medium (12×12), small (8×8) or line (one row each)' })
    await $.command.register({ name: 'agent-outline', description: 'Hero outline: thin (shadow side), dark (all round) or none' })
    await $.command.register({ name: 'agent-cast', description: 'Pick the hero for an agent type: /agent-cast my-agent=code-reviewer' })
    await $.command.register({ name: 'agent-log', description: 'Open the Quest Log: every agent of this session, running and finished' })
    // WHY: the look is a preference, so it lives in $.store and outlives the session
    const [savedTheme, savedSize, savedOutline, savedCast] = await Promise.all(['theme', 'size', 'outline', 'cast'].map(key => $.store.get(key)))
    if (isOneOf(THEMES, savedTheme)) await update($, theme, () => savedTheme)
    if (isOneOf(SIZES, savedSize)) await update($, size, () => savedSize)
    if (isOneOf(OUTLINES, savedOutline)) await update($, outline, () => savedOutline)
    if (savedCast && typeof savedCast === 'object') await update($, cast, () => savedCast as Record<string, string>)
    // WHY: agents kept in $.state across a reload may predate the newer fields
    await update($, agents, list => list.map(agent => ({ ...fresh(agent.startedAt), ...agent })))

    $.clock.every(TICK_MS, () => {
      void (async () => {
        const now = await $.clock.now()
        const list = await read($, agents)
        const kept = list.filter(agent => !agent.endedAt || now - agent.endedAt < LINGER_MS)
        if (kept.length !== list.length) await update($, agents, () => kept)
        for (const agent of kept) {
          if (!isStuck(agent, now)) warned.delete(agent.id)
          else if (!warned.has(agent.id)) {
            warned.add(agent.id)
            say(`${spoken(agent.type)} seems stuck`, true)
          }
        }
        const status = summary(kept, now)
        if (status !== shownStatus) $.ui.status((shownStatus = status))
        if (kept.length) $.ui.invalidate('ui.render')
        if (!isSpeaking && speech.length) await speakNext($)
      })()
    })
    return next(e)
  })

  on('command.run', { command: 'agent-theme' }, async ($, e) => {
    const { value, text } = pick(e.args, await read($, theme), THEMES, 'theme')
    if (value) await Promise.all([update($, theme, () => value), $.store.set('theme', value)])
    return { text }
  })

  on('command.run', { command: 'agent-size' }, async ($, e) => {
    const { value, text } = pick(e.args, await read($, size), SIZES, 'size')
    if (value) await Promise.all([update($, size, () => value), $.store.set('size', value)])
    return { text }
  })

  on('command.run', { command: 'agent-outline' }, async ($, e) => {
    const { value, text } = pick(e.args, await read($, outline), OUTLINES, 'outline')
    if (value) await Promise.all([update($, outline, () => value), $.store.set('outline', value)])
    return { text }
  })

  on('command.run', { command: 'agent-voice' }, async $ => {
    const isOn = await update($, isVoiceOn, value => !value)
    if (!isOn) speech.length = 0
    return { text: `agent-party voice ${isOn ? 'on' : 'off'}` }
  })

  on('command.run', { command: 'agent-log' }, async $ => {
    await $.ui.open({ id: LOG_PANE, title: 'Quest Log' })
    return { text: 'agent-party: Quest Log opened' }
  })

  on('command.run', { command: 'agent-cast' }, async ($, e) => {
    const asked = e.args.trim()
    const roles = Object.keys(HEROES)
    const save = async (map: Record<string, string>) => {
      await update($, cast, () => map)
      await $.store.set('cast', map)
    }
    if (asked === 'reset') {
      await save({})
      return { text: 'agent-party cast: every agent type plays the role its name hints at again' }
    }
    const pair = /^(\S+?)\s*=\s*(\S*)$/.exec(asked)
    if (!pair) {
      const mine = Object.entries(await read($, cast)).map(([type, role]) => `  ${type} = ${role}`)
      return {
        text: [
          `Roles: ${roles.join(', ')}`,
          mine.length ? `Your picks:\n${mine.join('\n')}` : 'No picks yet: an unknown type plays the role its name hints at.',
          'Pick: /agent-cast my-agent=code-reviewer · undo: /agent-cast my-agent= · clear all: /agent-cast reset',
        ].join('\n'),
      }
    }
    const [, type, role] = pair as unknown as [string, string, string]
    if (role && !roles.includes(role)) return { text: `Unknown role "${role}". Use one of: ${roles.join(', ')}` }
    const map = { ...(await read($, cast)) }
    if (role) map[type] = role
    else delete map[type]
    await save(map)
    const shown = heroOf(role || type, await read($, theme)).class
    return { text: `agent-party cast: ${type} plays the ${shown}${role ? '' : ` (guessed: ${roleOf(type)})`}` }
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (!started.agentId) return started
    const type = e.subagentType || 'general-purpose'
    const now = await $.clock.now()
    const agent: Agent = {
      id: started.agentId,
      type,
      title: e.description,
      activity: 'Getting started…',
      startedAt: now,
      context: 0,
      calls: 0,
      status: 'running',
      ...fresh(now),
      parentId: e.parentAgentId,
    }
    await update($, agents, list => [...list.filter(one => one.id !== agent.id), agent])
    say(`${spoken(type)} started: ${e.description}`, true)
    return started
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    const agent = id ? (await read($, agents)).find(one => one.id === id && one.status === 'running') : undefined
    if (!agent || !id) return next(e)

    const input = e as unknown as Record<string, unknown>
    const activity = describe(e.tool, input)
    const call = `${e.tool} ${JSON.stringify({ ...input, agentId: undefined })}`.slice(0, 500)
    const isWrite = e.tool === 'Edit' || e.tool === 'Write' || e.tool === 'NotebookEdit'
    const file = isWrite ? String(input.file_path ?? input.notebook_path ?? '') : ''
    const started = await $.clock.now()
    await patch($, id, one => ({
      ...one,
      activity,
      calls: one.calls + 1,
      inFlight: one.inFlight + 1,
      seenAt: started,
      lastCall: call,
      repeats: one.lastCall === call ? one.repeats + 1 : 1,
    }))
    if (started - (spokenAt.get(id) ?? 0) > CHATTER_MS) {
      spokenAt.set(id, started)
      say(`${spoken(agent.type)}: ${activity}`)
    }

    let isError = false // an abort (Esc) throws and is not the agent's fault, so it costs no heart
    try {
      const result = await next(e)
      isError = 'deny' in result || result.isError === true
      return result
    } finally {
      const ended = await $.clock.now()
      await patch($, id, one => ({
        ...one,
        inFlight: Math.max(0, one.inFlight - 1),
        seenAt: ended,
        ...(isError ? { errors: one.errors + 1, hurtAt: ended } : {}),
        ...(!isError && file && !one.files.includes(file) ? { files: [...one.files, file] } : {}),
        ...(e.tool === 'Bash' && isTestRun(input.command) ? { tests: one.tests + 1 } : {}),
      }))
    }
  })

  on('turn.step', async function* ($, e, next) {
    const step = yield* next(e)
    const usage = step.usage
    if (e.agentId && usage) {
      const context = usage.input_tokens + usage.cache_read_input_tokens + (usage.cache_creation_input_tokens ?? 0)
      const now = await $.clock.now()
      await patch($, e.agentId, one => ({ ...one, context: context + usage.output_tokens, seenAt: now }))
    }
    return step
  })

  on('turn.complete', async ($, e, next) => {
    const id = e.agentId
    const agent = id ? (await read($, agents)).find(one => one.id === id && !one.endedAt) : undefined
    if (agent && id) {
      const isFailed = e.isAborted || e.reason === 'refusal'
      const now = await $.clock.now()
      const latest = (await read($, agents)).find(one => one.id === id) ?? agent
      const brought = loot(latest)
      const ended: Agent = {
        ...latest,
        status: isFailed ? 'failed' : 'done',
        activity: `${isFailed ? 'Stopped ✗' : 'Done ✓'}${brought ? ` · ${brought}` : ''}`,
        endedAt: now,
        inFlight: 0,
      }
      await patch($, id, () => ended)
      await update($, log, list => [...list, ended].slice(-LOG_KEEP))
      say(`${spoken(agent.type)} ${isFailed ? 'stopped' : 'finished'}: ${agent.title}`, true)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, agents)
    if (!list.length || e.props.hasSurvey) return next(e)

    const table = $.ui.resolve(e)
    const { Box, Text } = table
    // Terminal: half-block Raster. Desktop, VS Code, mobile: the same pixels as an Svg.
    // WHY e.surface: the table names every element on every surface (a missing one draws nothing),
    // so `'Raster' in table` is true everywhere.
    const isTerminal = e.surface === 'terminal'
    const Raster = isTerminal && 'Raster' in table ? table.Raster : undefined
    const Svg = !isTerminal && 'Svg' in table ? table.Svg : undefined
    const now = await $.clock.now()
    const tick = Math.floor(now / TICK_MS)
    const theTheme = await read($, theme)
    const picks = await read($, cast)
    const look = { outline: await read($, outline) }

    // An agent another agent spawned stands under it as a small familiar while its parent is on stage.
    const onStage = new Set(list.map(agent => agent.id))
    const leaders = list.filter(agent => !agent.parentId || !onStage.has(agent.parentId))
    const shown = sizeFor(await read($, size), leaders.length, e.props.bodyColumns ?? 100)

    const card = (agent: Agent, size: Exclude<Size, 'auto'>, isFamiliar: boolean) => {
      const role = picks[agent.type] ?? agent.type
      const isRunning = agent.status === 'running'
      const tone = agent.status === 'failed' ? 'red' : agent.status === 'done' ? 'green' : colorOf(role, theTheme)
      const heroName = (
        <Text wrap="truncate">
          {isFamiliar ? <Text dimColor>↳ </Text> : ''}
          <Text bold color={colorOf(role, theTheme)}>{agent.type}</Text>
          <Text dimColor> the {classOf(role, theTheme)} · Lv {agent.calls + 1}</Text>
        </Text>
      )
      const warning =
        isStuck(agent, now) ? `💦 Quiet for ${elapsed(now - agent.seenAt)}, stuck?`
        : isRunning && agent.repeats >= LOOP_REPEATS ? `🔁 ${agent.activity} ×${agent.repeats}`
        : undefined
      const activity = (
        <Text italic color={warning ? 'yellow' : isRunning ? undefined : tone} wrap="truncate">
          {warning ?? agent.activity}
        </Text>
      )
      const stats = (
        <Text dimColor wrap="truncate">
          {' '}⏱ {elapsed((agent.endedAt ?? now) - agent.startedAt)}
          {agent.context ? ` · ↓ ${tokens(agent.context)} tokens` : ''}
          {agent.errors ? <Text color="red"> {hearts(agent)}</Text> : ''}
        </Text>
      )

      if (size === 'line') {
        const mark = agent.status === 'done' ? '✓' : agent.status === 'failed' ? '✗' : '●'
        return (
          <Text wrap="truncate">
            {isFamiliar ? <Text dimColor>  ↳ </Text> : ''}
            <Text color={tone}>{mark} </Text>
            <Text bold color={colorOf(role, theTheme)}>{agent.type}</Text>
            <Text> {agent.title} · </Text>
            <Text italic color={warning ? 'yellow' : undefined}>{warning ?? agent.activity}</Text>
            <Text dimColor> · {elapsed((agent.endedAt ?? now) - agent.startedAt)}</Text>
            {agent.errors ? <Text color="red"> {hearts(agent)}</Text> : ''}
          </Text>
        )
      }

      const isSmall = size === 'small' // 4 rows: no room for the bubble's border
      const mode: Mode =
        agent.status === 'done' ? 'done'
        : agent.status === 'failed' ? 'failed'
        : now - (agent.hurtAt ?? 0) < HURT_MS ? 'hurt'
        : 'work'
      const age = Math.floor((now - agent.startedAt) / TICK_MS)
      const sinceEnd = agent.endedAt ? Math.floor((now - agent.endedAt) / TICK_MS) : undefined
      const grid = frame(role, mode, tick, age, sinceEnd, theTheme, { ...look, pixels: PIXELS[size] })
      const sprite =
        Raster ? <Raster key={`sprite-${agent.id}`} {...cellsOf(grid)} cells={spriteCells(grid)} />
        : Svg ? <Svg source={spriteSvg(grid)} alt={`${agent.type} the ${classOf(role, theTheme)}`} width={grid.length * 4} height={grid.length * 4} />
        : ''

      return (
        <Box flexDirection="row" gap={1}>
          {sprite}
          <Box flexDirection="column" width={BUBBLE + 4}>
            {heroName}
            {isSmall ? (
              <Text bold wrap="truncate">{agent.title}</Text>
            ) : (
              <Box flexDirection="column" borderStyle="round" borderColor={tone} paddingX={1}>
                <Text bold wrap="truncate">{agent.title}</Text>
                {activity}
              </Box>
            )}
            {isSmall ? activity : ''}
            {stats}
          </Box>
        </Box>
      )
    }

    // A leader with its familiars beneath it, and theirs beneath them.
    const party = (agent: Agent, depth: number): RenderNode => {
      const familiars = depth < 3 ? list.filter(one => one.parentId === agent.id) : []
      const size = depth === 0 ? shown : shown === 'line' ? 'line' : 'small'
      if (!familiars.length) return card(agent, size, depth > 0)
      return (
        <Box flexDirection="column">
          {card(agent, size, depth > 0)}
          <Box flexDirection="column" paddingLeft={shown === 'line' ? 2 : 4}>
            {familiars.map(one => party(one, depth + 1))}
          </Box>
        </Box>
      )
    }

    const cards = leaders.map(agent => party(agent, 0))
    return shown === 'line' ? (
      <Box flexDirection="column">{cards}</Box>
    ) : (
      <Box flexDirection="row" flexWrap="wrap" columnGap={3}>{cards}</Box>
    )
  })

  // The Quest Log: who is out now, then every quest that came back, newest first.
  on('ui.render', { component: 'Pane', requestId: LOG_PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const theTheme = await read($, theme)
    const picks = await read($, cast)
    const running = (await read($, agents)).filter(agent => agent.status === 'running')
    const finished = await read($, log)
    const everyone = [...running, ...finished]
    const typeOf = (id?: string) => everyone.find(agent => agent.id === id)?.type
    const spent = everyone.reduce((sum, agent) => sum + agent.context, 0)
    const room = Math.max(1, Math.floor(((e.viewport?.rows ?? 24) - 3) / 2))

    const row = (agent: Agent) => {
      const role = picks[agent.type] ?? agent.type
      const mark = agent.status === 'done' ? '✓' : agent.status === 'failed' ? '✗' : '●'
      const tone = agent.status === 'failed' ? 'red' : agent.status === 'done' ? 'green' : colorOf(role, theTheme)
      const parent = typeOf(agent.parentId)
      const facts = [
        `⏱ ${elapsed((agent.endedAt ?? now) - agent.startedAt)}`,
        agent.context && `↓ ${tokens(agent.context)}`,
        agent.status === 'running' ? agent.activity : loot(agent),
        parent && `summoned by ${parent}`,
      ].filter(Boolean).join(' · ')
      return (
        <Box flexDirection="column">
          <Text wrap="truncate">
            <Text color={tone}>{mark} </Text>
            <Text bold color={colorOf(role, theTheme)}>{agent.type}</Text>
            <Text dimColor> the {classOf(role, theTheme)} · </Text>
            <Text>{agent.title}</Text>
          </Text>
          <Text dimColor wrap="truncate">
            {'  '}{facts}
            {agent.errors ? <Text color="red"> {hearts(agent)}</Text> : ''}
          </Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Text bold wrap="truncate">
          ⚔ {running.length} out · {finished.length} back{spent ? ` · ↓ ${tokens(spent)} tokens` : ''}
        </Text>
        {everyone.length ? '' : <Text dimColor>No quests yet. Spawn an agent and it shows up here.</Text>}
        {[...running, ...[...finished].reverse()].slice(0, room).map(row)}
      </Box>
    )
  })
}
