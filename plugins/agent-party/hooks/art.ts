// 16×16 sprite compositing: body + class hat/outfit/prop, then animation, then a computed outline.
// Pure data in, pixels out, no engine imports, so the HTML demo draws the exact same frames.
import { heroOf } from './heroes'
import type { Layer, Theme } from './heroes'

export const SIZE = 16
export const TICK_MS = 250 // 4 fps: work loops step every tick, the idle bob every second tick

export type Mode = 'work' | 'done' | 'failed'
export type Grid = (number | null)[][] // 0xRRGGBB per pixel, null = transparent

// Chibi anatomy, light from the top left: hair 3–4 · face 5–7 (eyes row 6, cols 6 and 9) · chin 8
// · torso 9–12 with 1 px hands · legs 13 · boots 14 · row 15 holds the outline.
const BODY = [
  '................',
  '................',
  '................',
  '.....HHHHHH.....',
  '....HHHHHHHH....',
  '....HssssssH....',
  '....ssessesS....',
  '....sssssssS....',
  '.....SSSSSS.....',
  '....CCCCCCCD....',
  '...sCCCCCCDDS...',
  '...sCCCCCCDDS...',
  '....DDDDDDDD....',
  '.....LL..LL.....',
  '.....FF..FF.....',
  '................',
]

const SHARED: Record<string, string> = {
  s: '#e8b796', S: '#c28569', e: '#181425', W: '#f4f4f4',
  M: '#c0cbdc', N: '#8b9bb4', P: '#b86f50', Q: '#733e39', R: '#e43b44',
}
export const OUTLINE = 0x181425

const num = (hex: string): number => parseInt(hex.slice(1), 16)
const blank = (): (number | null)[] => Array<number | null>(SIZE).fill(null)

const paint = (letters: string[][], layer: Layer) =>
  layer.rows.forEach((line, dr) =>
    [...line].forEach((ch, dc) => {
      const row = letters[layer.at[0] + dr]
      const col = layer.at[1] + dc
      if (ch !== '.' && row && col >= 0 && col < SIZE) row[col] = ch
    }),
  )

const outline = (grid: Grid): Grid =>
  grid.map((row, r) =>
    row.map((px, c) => {
      if (px !== null) return px
      const near = [grid[r - 1]?.[c], grid[r + 1]?.[c], row[c - 1], row[c + 1]]
      return near.some(n => n !== undefined && n !== null && n !== OUTLINE) ? OUTLINE : null
    }),
  )

const shift = (grid: Grid, by: number): Grid =>
  grid.map((_, r) => (grid[r - by] ? [...grid[r - by]!] : blank()))

const grey = (rgb: number): number => {
  const y = Math.round(0.3 * (rgb >> 16) + 0.59 * ((rgb >> 8) & 255) + 0.11 * (rgb & 255))
  const v = Math.round(y * 0.75)
  return (v << 16) | (v << 8) | v
}

const sparkle = (grid: Grid, color: number, spots: number[][]) => {
  for (const [r, c] of spots) if (grid[r!]?.[c!] === null) grid[r!]![c!] = color
}

const compose = (type: string, theme: Theme, propFrame: number, isBlink: boolean, isKo: boolean): Grid => {
  const hero = heroOf(type, theme)
  const colors = { ...SHARED, ...hero.colors }
  const letters = (hero.body ?? BODY).map(line => [...line])
  hero.hat.forEach((line, r) => line && paint(letters, { at: [r, 0], rows: [line] }))
  hero.outfit?.forEach(layer => paint(letters, layer))
  hero.props[propFrame % hero.props.length]!.forEach(layer => paint(letters, layer))
  return letters.map((row, r) =>
    row.map((ch, c) => {
      // closed or knocked-out eyes: the eye takes the colour of the pixel on its left
      const shown = ch === 'e' && (isBlink || isKo) ? (row[c - 1] === 's' ? 'S' : (row[c - 1] ?? 'S')) : ch
      return shown === '.' ? null : num(colors[shown] ?? '#ff00ff')
    }),
  )
}

/**
 * The pixels of one frame. `tick` is the global animation clock (TICK_MS steps); `age` counts ticks
 * since the agent spawned, `sinceEnd` ticks since it finished: they drive the one-shot effects.
 */
export const frame = (type: string, mode: Mode, tick: number, age = 99, sinceEnd = 99, theme: Theme = 'party'): Grid => {
  const accent = num(heroOf(type, theme).colors.A ?? '#feae34')
  const white = num(SHARED.W!)

  if (age === 0) {
    const poof = Array.from({ length: SIZE }, blank)
    sparkle(poof, white, [[6, 7], [6, 8], [7, 6], [7, 9], [8, 6], [8, 9], [9, 7], [9, 8], [7, 7], [8, 8]])
    return outline(poof)
  }
  if (age === 1) {
    const ghost = compose(type, theme, 0, false, false).map(row => row.map(px => (px === null ? null : white)))
    sparkle(ghost, white, [[2, 2], [3, 13], [12, 1], [13, 14]])
    return outline(ghost)
  }

  if (mode === 'failed') {
    return outline(shift(compose(type, theme, 0, false, true), 2).map(row => row.map(px => (px === null ? null : grey(px)))))
  }

  if (mode === 'done') {
    let grid = compose(type, theme, 1, false, false)
    if (sinceEnd === 0) grid = shift(grid, -1)
    sparkle(grid, accent, sinceEnd === 0 ? [[1, 2], [0, 8], [2, 13]] : [[0, 7], [1, 3], [1, 12]])
    return outline(grid)
  }

  const isBlink = tick % 16 === 15
  let grid = compose(type, theme, tick, isBlink, false)
  if (age === 2) sparkle(grid, accent, [[1, 3], [2, 12]])
  if (Math.floor(tick / 2) % 2 === 1) {
    // idle bob: everything above the legs sinks a pixel; the belt row covers the top of the legs
    const sunk = shift(grid, 1)
    grid = grid.map((row, r) => (r >= 13 ? row.map((px, c) => (r === 13 ? (sunk[r]![c] ?? px) : px)) : sunk[r]!))
  }
  return outline(grid)
}
