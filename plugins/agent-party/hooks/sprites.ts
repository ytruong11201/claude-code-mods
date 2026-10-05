import { frame } from './art'
import type { Mode } from './art'
import { heroOf } from './heroes'
import type { Theme } from './heroes'

// One terminal cell carries two pixels with the upper half block: top pixel as the glyph's colour,
// bottom pixel as its background. 16×16 pixels → 16 columns × 8 rows.
export const COLUMNS = 16
export const ROWS = 8

const DEFAULT = 0x01000000 // the terminal's own colour

export const colorOf = (type: string, theme?: Theme): string => heroOf(type, theme).colors.C ?? '#94a3b8'
export const classOf = (type: string, theme?: Theme): string => heroOf(type, theme).class

// Raster cells: row-major little-endian u32 triplets [codePoint, foreground, background], base64.
export const spriteCells = (type: string, mode: Mode, tick: number, age?: number, sinceEnd?: number, theme?: Theme): string => {
  const grid = frame(type, mode, tick, age, sinceEnd, theme)
  const words = new Uint32Array(COLUMNS * ROWS * 3)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const top = grid[row * 2]![col] ?? null
      const bottom = grid[row * 2 + 1]![col] ?? null
      const cell =
        top !== null ? [0x2580, top, bottom ?? DEFAULT] // ▀
        : bottom !== null ? [0x2584, bottom, DEFAULT] // ▄
        : [0x20, DEFAULT, DEFAULT]
      words.set(cell, (row * COLUMNS + col) * 3)
    }
  }
  let binary = ''
  for (const byte of new Uint8Array(words.buffer)) binary += String.fromCharCode(byte)
  return btoa(binary)
}
