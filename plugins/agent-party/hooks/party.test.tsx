import { expect, mock, test } from 'claude-code/testing'

import { describe } from './activity'
import { COLUMNS, ROWS, spriteCells } from './sprites'

test('a sprite is COLUMNS×ROWS half-block cells', () => {
  const bytes = Uint8Array.from(atob(spriteCells('planner', 'work', 0)), ch => ch.charCodeAt(0))
  const words = new Uint32Array(bytes.buffer)
  expect(words.length).toBe(COLUMNS * ROWS * 3)
  expect([...words].filter((_, i) => i % 3 === 0).every(cp => [0x20, 0x2580, 0x2584].includes(cp))).toBe(true)
  expect(spriteCells('planner', 'work', 0)).not.toBe(spriteCells('planner', 'work', 1))
})

test('tool calls read as speech', () => {
  expect(describe('Read', { file_path: '/x/src/product.service.ts' })).toBe('Reading product.service.ts')
  expect(describe('Bash', { command: 'npm test', description: 'Run the unit tests' })).toBe('Run the unit tests')
  expect(describe('mcp__postgres__query', {})).toBe('Asking postgres: query')
})

test('a spawned agent walks on stage and says what it does', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('tool.call', async () => ({ result: 'ok' as never }))
  await $.agent.spawn({ prompt: 'p', description: 'Plan the product search page', subagentType: 'planner' })
  await $.tool.call({ tool: 'Read', file_path: '/repo/product.service.ts', agentId: 'a1' } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'agent-party',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } as never,
    })
    expect(await ui.find({ type: 'Text', text: 'planner' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Plan the product search page' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Reading product.service.ts' })).toBeDefined()
    if (surface === 'terminal') expect(await ui.find({ key: 'sprite-a1' })).toBeDefined()
    await ui.unmount()
  }
})

test('/agent-theme swaps the cast and remembers it', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'a2' }))
  await $.agent.spawn({ prompt: 'p', description: 'Deliver the commit', subagentType: 'git-manager' })
  expect((await $.command.run({ command: 'agent-theme', args: 'wizarding' })).text).toBe('agent-party theme: wizarding')
  expect((await $.command.run({ command: 'agent-theme', args: 'muggle' })).text).toContain('Unknown theme')

  const ui = await $.ui.mount({
    plugin: 'agent-party',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } as never,
  })
  expect(await ui.find({ type: 'Text', text: /the Post Owl/ })).toBeDefined()
  await ui.unmount()
})
