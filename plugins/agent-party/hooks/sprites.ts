import type { Grid } from './art'
import { heroOf } from './heroes'
import type { Theme } from './heroes'

const DEFAULT = 0x01000000 // the terminal's own colour

export const colorOf = (type: string, theme?: Theme): string => heroOf(type, theme).colors.C ?? '#94a3b8'
export const classOf = (type: string, theme?: Theme): string => heroOf(type, theme).class

// One terminal cell carries two pixels with the upper half block: top pixel as the glyph's colour,
// bottom pixel as its background. 16×16 pixels → 16 columns × 8 rows; 8×8 → 8 × 4.
export const cellsOf = (grid: Grid) => ({ columns: grid[0]!.length, rows: Math.ceil(grid.length / 2) })

// Raster cells: row-major little-endian u32 triplets [codePoint, foreground, background], base64.
export const spriteCells = (grid: Grid): string => {
  const { columns, rows } = cellsOf(grid)
  const words = new Uint32Array(columns * rows * 3)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const top = grid[row * 2]![col] ?? null
      const bottom = grid[row * 2 + 1]?.[col] ?? null
      const cell =
        top !== null ? [0x2580, top, bottom ?? DEFAULT] // ▀
        : bottom !== null ? [0x2584, bottom, DEFAULT] // ▄
        : [0x20, DEFAULT, DEFAULT]
      words.set(cell, (row * columns + col) * 3)
    }
  }
  let binary = ''
  for (const byte of new Uint8Array(words.buffer)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const hex = (rgb: number) => `#${rgb.toString(16).padStart(6, '0')}`

// The same pixels for the surfaces without a terminal (desktop, VS Code, mobile): one rect per colour run.
export const spriteSvg = (grid: Grid): string => {
  let rects = ''
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const px = row[x] ?? null
      let end = x + 1
      while (end < row.length && (row[end] ?? null) === px) end++
      if (px !== null) rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${hex(px)}"/>`
      x = end
    }
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid[0]!.length} ${grid.length}" shape-rendering="crispEdges">${rects}</svg>`
}
