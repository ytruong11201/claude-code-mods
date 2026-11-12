import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'english-coach',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

const submit = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as const

function setup(on: On, reply: string) {
  const clock = mock.clock(on)
  mock.store(on)
  const sent: string[] = []
  const passed: string[] = []
  const logs: string[] = []
  on('ui.log', (_, e) => {
    logs.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', () => ({ value: undefined }))
  // Stands for the engine's own empty band.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('model.complete', (_, e) => {
    sent.push(e.prompt)
    return { value: { isAnswered: true, text: reply, usage } }
  })
  on('prompt.submit', (_, e) => {
    passed.push(e.text)
    return { text: e.text }
  })
  return { clock, sent, passed, logs }
}

const PROMPT = [
  'please you help me fix bug in `useAuth` hook at src/auth/useAuth.ts, it not work when token expire',
  '```ts',
  'const x = 1',
  '```',
  'TypeError: cannot read properties of undefined',
  '    at refresh (src/auth.ts:12:3)',
  '$ npm test',
].join('\n')

test('coaches a cleaned prompt, leaves the prompt untouched, shows feedback', async ($, on) => {
  const { clock, sent, passed, logs } = setup(on, '✎ Can you fix the bug?\n💡 "please you help me" → "can you" — more natural')

  await $.prompt.submit(submit(PROMPT))
  expect(passed).toEqual([PROMPT])
  await clock.settle()

  expect(sent.length).toBe(1)
  expect(sent[0]).toBe('please you help me fix bug in hook at it not work when token expire')
  expect(logs.join('\n')).toContain('Can you fix the bug?')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /✎/ }))?.text).toContain('Can you fix the bug?')
    await ui.unmount()
  }
})

test('OK reply and short prompts show nothing', async ($, on) => {
  const { clock, sent, logs } = setup(on, 'OK')

  await $.prompt.submit(submit('fix it now'))
  await clock.settle()
  expect(sent.length).toBe(0)

  await $.prompt.submit(submit('Could you add a retry to the upload request, please?'))
  await clock.settle()
  expect(sent.length).toBe(1)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /english-coach|✎/ })).toBeUndefined()
  expect(logs).toEqual([])
  await ui.unmount()
})
