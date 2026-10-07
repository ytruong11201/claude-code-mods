import { expect, mock, test } from 'claude-code/testing'

import { describe, isTestRun, loot } from './activity'
import { eyeOf, frame, OUTLINE, shrink } from './art'
import { HEROES, roleOf } from './heroes'
import { WIZARDING } from './heroes-wizarding'
import { cellsOf, spriteCells, spriteSvg } from './sprites'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } as never,
} as const

const words = (cells: string) => new Uint32Array(Uint8Array.from(atob(cells), ch => ch.charCodeAt(0)).buffer)

test('a sprite is half-block cells: 16×8 large, 12×6 medium, 8×4 small', () => {
  for (const [pixels, columns, rows] of [[16, 16, 8], [12, 12, 6], [8, 8, 4]] as const) {
    const grid = frame('planner', 'work', 0, 99, 99, 'party', { pixels })
    expect(cellsOf(grid)).toEqual({ columns, rows })
    const cells = words(spriteCells(grid))
    expect(cells.length).toBe(columns * rows * 3)
    expect([...cells].filter((_, i) => i % 3 === 0).every(cp => [0x20, 0x2580, 0x2584].includes(cp))).toBe(true)
  }
  expect(spriteCells(frame('planner', 'work', 0))).not.toBe(spriteCells(frame('planner', 'work', 1)))
  expect(spriteSvg(frame('planner', 'work', 0))).toMatch(/^<svg [^>]*viewBox="0 0 16 16"[^>]*>(<rect [^>]+\/>)+<\/svg>$/)
})

test('outline styles: dark inks all round, thin only the shadow side, none leaves it off', () => {
  const ink = (outline: 'dark' | 'thin' | 'none') =>
    frame('tester', 'work', 0, 99, 99, 'party', { outline }).flat().filter(px => px !== null).length
  expect(ink('none')).toBeLessThan(ink('thin'))
  expect(ink('thin')).toBeLessThan(ink('dark'))
})

test('every hero fits the smaller sprites: nothing in column 15, and both eyes survive the shrink', () => {
  for (const [cast, theme] of [[HEROES, 'party'], [WIZARDING, 'wizarding']] as const) {
    for (const type of Object.keys(cast)) {
      for (const tick of [0, 1, 2, 3]) {
        const grid = frame(type, 'work', tick, 99, 99, theme, { outline: 'none' })
        expect(grid.every(row => row[15] === null), `${theme} ${type} draws in column 15`).toBe(true)
      }
    }
  }
  const eyesOf = (row: (number | null)[]) => row.flatMap((px, c) => (px === OUTLINE ? [c] : []))
  const big = frame('planner', 'work', 0, 99, 99, 'party', { outline: 'none' })
  expect(eyesOf(shrink(big, 8, OUTLINE)[3]!)).toEqual([3, 5])
  expect(eyesOf(shrink(big, 12, OUTLINE)[4]!)).toEqual([4, 7])
})

test('every hero of both casts keeps two eyes at every size', () => {
  for (const [cast, theme] of [[HEROES, 'party'], [WIZARDING, 'wizarding']] as const) {
    for (const type of Object.keys(cast)) {
      const eye = eyeOf(type, theme)
      const big = frame(type, 'work', 0, 99, 99, theme, { outline: 'none' })
      // the face sits in the top 10 rows (lower down the same ink can be boots); a quill may share it
      const eyes = (grid: (number | null)[][], rows: number) => grid.slice(0, rows).flat().filter(px => px === eye).length
      expect(eyes(big, 10), `${theme} ${type} at 16×16`).toBeGreaterThanOrEqual(2)
      expect(eyes(shrink(big, 12, eye), 8), `${theme} ${type} at 12×12`).toBeGreaterThanOrEqual(2)
      expect(eyes(shrink(big, 8, eye), 5), `${theme} ${type} at 8×8`).toBeGreaterThanOrEqual(2)
    }
  }
})

test('an agent type no cast names plays the role its name hints at', () => {
  expect(roleOf('planner')).toBe('planner')
  expect(roleOf('Plan')).toBe('planner')
  expect(roleOf('superpowers:code-reviewer')).toBe('code-reviewer')
  expect(roleOf('ck:api-dev')).toBe('backend-developer')
  expect(roleOf('e2e-runner')).toBe('tester')
  expect(roleOf('ui-designer')).toBe('frontend-developer')
  expect(roleOf('mystery')).toBe('general-purpose')
})

test('what an agent brought back reads as loot', () => {
  expect(loot({ files: ['a.ts', 'b.ts'], tests: 1, errors: 0 })).toBe('2 files · 1 test run')
  expect(loot({ files: [], tests: 0, errors: 3 })).toBe('3 errors')
  expect(loot({ files: [], tests: 0, errors: 0 })).toBe('')
  expect(isTestRun('npm test')).toBe(true)
  expect(isTestRun('npx vitest run src')).toBe(true)
  expect(isTestRun('ls -la')).toBe(false)
})

test('tool calls read as speech', () => {
  expect(describe('Read', { file_path: '/x/src/product.service.ts' })).toBe('Reading product.service.ts')
  expect(describe('Bash', { command: 'npm test', description: 'Run the unit tests' })).toBe('Run the unit tests')
  expect(describe('mcp__postgres__query', {})).toBe('Asking postgres: query')
})

test('a spawned agent walks on stage and says what it does, on every surface', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('tool.call', async () => ({ result: 'ok' as never }))
  await $.command.run({ command: 'agent-theme', args: 'party' }) // the class names below are the party cast's
  await $.agent.spawn({ prompt: 'p', description: 'Plan the product search page', subagentType: 'planner' })
  await $.tool.call({ tool: 'Read', file_path: '/repo/product.service.ts', agentId: 'a1' } as never)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'agent-party', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: 'planner' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Plan the product search page' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Reading product.service.ts' })).toBeDefined()
    if (surface === 'terminal') expect(await ui.find({ key: 'sprite-a1' })).toBeDefined()
    else expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('planner the Wizard')
    await ui.unmount()
  }
})

test('/agent-size medium and small draw smaller sprites, line one row per agent', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'a3' }))
  await $.agent.spawn({ prompt: 'p', description: 'Audit the login', subagentType: 'security-auditor' })

  for (const [size, columns, rows] of [['medium', 12, 6], ['small', 8, 4]] as const) {
    expect((await $.command.run({ command: 'agent-size', args: size })).text).toBe(`agent-party size: ${size}`)
    const ui = await $.ui.mount({ plugin: 'agent-party', surface: 'terminal', ...BAND })
    const sprite = await ui.find({ key: 'sprite-a3' })
    expect([sprite?.props.columns, sprite?.props.rows]).toEqual([columns, rows])
    await ui.unmount()
  }

  expect((await $.command.run({ command: 'agent-size', args: 'line' })).text).toBe('agent-party size: line')
  const ui = await $.ui.mount({ plugin: 'agent-party', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'sprite-a3' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Audit the login/ })).toBeDefined()
  await ui.unmount()

  expect((await $.command.run({ command: 'agent-size', args: 'huge' })).text).toContain('Unknown size')
  expect((await $.command.run({ command: 'agent-outline', args: 'none' })).text).toBe('agent-party outline: none')
})

test('a failed tool call costs a heart; a quiet agent reads as stuck', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'a4' }))
  on('tool.call', async () => ({ result: 'boom' as never, isError: true }))
  await $.agent.spawn({ prompt: 'p', description: 'Fix the build', subagentType: 'fullstack-developer' })
  await $.tool.call({ tool: 'Bash', command: 'npm run build', agentId: 'a4' } as never)

  let ui = await $.ui.mount({ plugin: 'agent-party', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: '♥♥♥♥♡' })).toBeDefined()
  await ui.unmount()

  await clock.advance(121_000)
  ui = await $.ui.mount({ plugin: 'agent-party', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /stuck\?/ })).toBeDefined()
  await ui.unmount()
})

test('/agent-cast gives a custom agent type the hero you pick', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'a5' }))
  await $.agent.spawn({ prompt: 'p', description: 'Look it over', subagentType: 'my-agent' })
  await $.command.run({ command: 'agent-theme', args: 'party' }) // the class names below are the party cast's
  expect((await $.command.run({ command: 'agent-cast', args: 'my-agent=wizard' })).text).toContain('Unknown role')
  expect((await $.command.run({ command: 'agent-cast', args: 'my-agent=code-reviewer' })).text).toBe('agent-party cast: my-agent plays the Knight')

  const ui = await $.ui.mount({ plugin: 'agent-party', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /the Knight/ })).toBeDefined()
  await ui.unmount()
  expect((await $.command.run({ command: 'agent-cast', args: '' })).text).toContain('my-agent = code-reviewer')
})

test('/agent-theme swaps the cast and remembers it', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'a2' }))
  await $.agent.spawn({ prompt: 'p', description: 'Deliver the commit', subagentType: 'git-manager' })
  expect((await $.command.run({ command: 'agent-theme', args: 'wizarding' })).text).toBe('agent-party theme: wizarding')
  expect((await $.command.run({ command: 'agent-theme', args: 'muggle' })).text).toContain('Unknown theme')

  const ui = await $.ui.mount({ plugin: 'agent-party', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /the Post Owl/ })).toBeDefined()
  await ui.unmount()
})

test('a finished quest shows its loot and lands in the Quest Log', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'a6' }))
  on('tool.call', async () => ({ result: 'ok' as never }))
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  await $.agent.spawn({ prompt: 'p', description: 'Add the search box', subagentType: 'frontend-developer' })
  for (const file_path of ['/repo/search.tsx', '/repo/search.tsx', '/repo/search.css'])
    await $.tool.call({ tool: 'Edit', file_path, agentId: 'a6' } as never)
  await $.tool.call({ tool: 'Bash', command: 'npm test -- search', agentId: 'a6' } as never)
  await $.turn.complete({ agentId: 'a6', turnId: 't6', isAborted: false, reason: 'answer', answer: 'Added it.' } as never)

  const band = await $.ui.mount({ plugin: 'agent-party', surface: 'terminal', ...BAND })
  expect(await band.find({ type: 'Text', text: 'Done ✓ · 2 files · 1 test run' })).toBeDefined()
  await band.unmount()

  // /agent-log only opens this pane ($.ui.open has no test double), so the test draws it directly
  const pane = await $.ui.mount({ plugin: 'agent-party', surface: 'terminal', component: 'Pane', requestId: 'agent-log', props: { bodyColumns: 80 } as never })
  expect(await pane.find({ type: 'Text', text: /0 out · 1 back/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'Add the search box' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /2 files · 1 test run/ })).toBeDefined()
  await pane.unmount()
})

test('an agent spawned by another stands under it as a small familiar', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  let next = 0
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: ['lead', 'kid'][next++]! }))
  await $.agent.spawn({ prompt: 'p', description: 'Plan the release', subagentType: 'planner' })
  await $.agent.spawn({ prompt: 'p', description: 'Find the callers', subagentType: 'Explore', parentAgentId: 'lead' } as never)

  const band = await $.ui.mount({ plugin: 'agent-party', surface: 'terminal', ...BAND })
  const lead = await band.find({ key: 'sprite-lead' })
  const kid = await band.find({ key: 'sprite-kid' })
  expect([lead?.props.columns, kid?.props.columns]).toEqual([16, 8]) // one leader: large; its familiar: small
  expect(await band.find({ type: 'Text', text: '↳ ' })).toBeDefined()
  await band.unmount()
})
