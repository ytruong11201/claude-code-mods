// The party: one RPG class per agent type. Letters are palette slots (shared ones in art.ts), '.' keeps
// what is beneath. Class colours: main C/T, shade D/U, accent A, after the Endesga 32 / Sweetie 16 ramps.
import type { Theme } from '../types'
import { WIZARDING } from './heroes-wizarding'

export type { Theme }

export type Layer = { at: [row: number, col: number]; rows: string[] }
export type Hero = {
  class: string
  body?: string[] // replaces the shared chibi body (an owl, a ghost…)
  colors: Record<string, string>
  hat: string[] // overlay from row 0; '' leaves a row alone
  outfit?: Layer[]
  props: Layer[][] // the held prop, one layer list per work frame
}

const at = (row: number, col: number, ...rows: string[]): Layer => ({ at: [row, col], rows })
const staff = at(5, 13, 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'Q')
const blade = (top: number) => at(top, 13, 'M', 'M', 'M', 'M', 'N')

export const HEROES: Record<string, Hero> = {
  planner: {
    class: 'Wizard',
    colors: { H: '#d9d4e8', C: '#8f5fd0', D: '#5b3f9e', L: '#5b3f9e', F: '#3e2731', T: '#8f5fd0', U: '#5b3f9e', A: '#feae34', G: '#2ce8f5' },
    hat: ['', '.........T......', '........TTA.....', '......TTTTTU....', '...UUUUUUUUUU...'],
    props: [
      [at(2, 12, '.G.', 'GWG', '.G.'), staff],
      [at(1, 12, 'A.A', '.W.', 'WGW', '.W.'), staff],
    ],
  },
  'backend-developer': {
    class: 'Dwarf Smith',
    colors: { H: '#733e39', B: '#be4a2f', C: '#e07a30', D: '#a24a2a', L: '#3e2731', F: '#181425', T: '#5a6988', U: '#3a4466', A: '#c0cbdc', G: '#feae34' },
    hat: ['', '', '', '.....TTTTTT.....', '....TTTTTTTU....', '', '', '....BBssssBB....', '.....BBBBBB.....', '......BBBB......'],
    outfit: [at(10, 5, 'QQQQQ'), at(11, 5, 'QQQQQ')],
    props: [
      [at(4, 12, 'AAA', 'NNN'), at(6, 13, 'P', 'P', 'P', 'P', 'Q')],
      [at(8, 12, 'AAA', 'NNN'), at(10, 13, 'P', 'Q'), at(6, 14, 'G'), at(7, 11, 'G')],
    ],
  },
  'frontend-developer': {
    class: 'Bard',
    colors: { H: '#feae34', C: '#e8639f', D: '#a83a82', L: '#3a4466', F: '#262b44', T: '#e8639f', U: '#a83a82', A: '#fee761', G: '#fee761' },
    hat: ['', '..........A.....', '.........AA.....', '.....TTTTTA.....', '...UTTTTTTTTU...'],
    props: [
      [at(6, 14, 'Q'), at(7, 13, 'Q'), at(8, 13, 'Q'), at(9, 11, 'PPP', 'PWP', '.P.'), at(4, 12, 'G')],
      [at(6, 14, 'Q'), at(7, 13, 'Q'), at(8, 13, 'Q'), at(9, 11, 'PPP', 'PWP', '.P.'), at(2, 13, 'G'), at(3, 11, 'G')],
    ],
  },
  'fullstack-developer': {
    class: 'Paladin',
    colors: { H: '#733e39', C: '#f2c230', D: '#c4862a', L: '#3a4466', F: '#262b44', T: '#f2c230', U: '#c4862a', A: '#3b5dc9', G: '#f4f4f4' },
    hat: ['', '........A.......', '......TTTT......', '.....TTTTTT.....', '....TTTTTTTU....', '....TssssssU....'],
    outfit: [at(9, 1, '.AAA', '.AWA', '.AAA', '..A.')],
    props: [
      [blade(4), at(9, 12, 'UUU'), at(10, 13, 'Q')],
      [at(3, 13, 'G'), blade(4), at(9, 12, 'UUU'), at(10, 13, 'Q'), at(2, 14, 'G')],
    ],
  },
  tester: {
    class: 'Alchemist',
    colors: { H: '#f77622', C: '#1fb5e0', D: '#1a7ab8', L: '#3a4466', F: '#262b44', T: '#f77622', U: '#be4a2f', A: '#a7f070', G: '#a7f070' },
    hat: ['', '', '.....H.H.H......', '', '....MWWMMWWM....'],
    props: [
      [at(8, 13, 'W'), at(9, 12, 'GGG', 'GWG', 'GGG'), at(6, 13, 'G')],
      [at(8, 13, 'W'), at(9, 12, 'GGG', 'GGG', 'GWG'), at(4, 14, 'G'), at(6, 12, 'W')],
    ],
  },
  'code-reviewer': {
    class: 'Knight',
    colors: { H: '#6a7a9a', C: '#aab6cc', D: '#6a7a9a', L: '#3a4466', F: '#262b44', T: '#aab6cc', U: '#6a7a9a', A: '#e43b44', G: '#f4f4f4' },
    hat: ['', '........AA......', '......TTTT......', '.....TTTTTT.....', '....TTTTTTTU....', '....TUUUUUUU....', '....TUeUUeUU....', '....TTTTTTTU....', '.....UUUUUU.....'],
    outfit: [at(9, 1, 'TAT', 'AAA', 'TAT', '.T.')],
    props: [
      [blade(4), at(9, 12, 'AAA'), at(10, 13, 'Q')],
      [at(2, 13, 'G'), blade(3), at(8, 12, 'AAA'), at(9, 13, 'Q'), at(1, 14, 'G')],
    ],
  },
  'security-auditor': {
    class: 'Rogue',
    colors: { H: '#7a2048', C: '#c8323c', D: '#7a2048', L: '#262b44', F: '#181425', T: '#c8323c', U: '#7a2048', A: '#262b44', G: '#f4f4f4', e: '#f4f4f4' },
    hat: ['', '', '......TTT.......', '.....TTTTTT.....', '....TTTTTTTU....', '....TAAAAAAU....', '....TAeAAeAU....', '....TAAAAAAU....', '.....UUUUUU.....'],
    props: [
      [at(8, 14, 'M'), at(9, 13, 'M'), at(10, 12, 'Q')],
      [at(6, 14, 'G'), at(7, 14, 'M'), at(8, 13, 'M'), at(9, 12, 'Q')],
    ],
  },
  'git-manager': {
    class: 'Courier',
    colors: { H: '#b86f50', C: '#3b5dc9', D: '#29366f', L: '#29366f', F: '#3e2731', T: '#3b5dc9', U: '#29366f', A: '#f4f4f4', G: '#e43b44' },
    hat: ['', '', '', '.....TTTTTT.....', '..UUTTTTTTTU....'],
    outfit: [at(9, 5, 'P'), at(10, 6, 'P'), at(11, 7, 'P'), at(12, 8, 'PPP')],
    props: [
      [at(9, 12, 'AAA', 'AGA')],
      [at(8, 12, 'AAA', 'AGA'), at(6, 14, 'A')],
    ],
  },
  researcher: {
    class: 'Sage',
    colors: { H: '#c0cbdc', C: '#ead4aa', D: '#b89a78', L: '#b89a78', F: '#733e39', T: '#c0cbdc', U: '#8b9bb4', A: '#5a6988', G: '#feae34' },
    hat: ['', '', '', '.....ssssss.....', '....HssssssH....', '', '....sMeMMeMS....', '....sHHHHHHS....', '.....HHHHHH.....', '......HHHH......', '.......HH.......'],
    props: [
      [at(10, 2, 'AWWA', 'AWWA')],
      [at(9, 3, '.W'), at(10, 2, 'AWGA', 'AWWA')],
    ],
  },
  Explore: {
    class: 'Ranger',
    colors: { H: '#b86f50', C: '#3e8948', D: '#265c42', L: '#733e39', F: '#3e2731', T: '#3e8948', U: '#265c42', A: '#b86f50', G: '#f4f4f4' },
    hat: ['', '', '......TTTT......', '.....TTTTTT.....', '..UTTTTTTTTU....', '...UT......U....', '....T......U....', '....T......U....'],
    props: [
      [at(5, 13, 'A.', '.A', '.A', '.A', '.A', '.A', '.A', 'A.'), at(6, 13, 'G', 'G', 'G', 'G', 'G', 'G')],
      [at(5, 13, 'A.', '.A', '.A', '.A', '.A', '.A', '.A', 'A.'), at(6, 12, 'G', 'G', 'G'), at(9, 10, 'WAAAA'), at(9, 12, 'G')],
    ],
  },
  scout: {
    class: 'Scout',
    colors: { H: '#3e2731', C: '#2fb0a0', D: '#257179', L: '#733e39', F: '#3e2731', T: '#2fb0a0', U: '#257179', A: '#fee761', G: '#fee761' },
    hat: ['', '', '', '', '....AAAAAAAAA...', '............A...', '.............A..'],
    props: [
      [at(6, 10, 'NMMMW'), at(7, 12, 'Q')],
      [at(6, 10, 'NMMMG'), at(5, 14, 'G'), at(7, 12, 'Q')],
    ],
  },
  'docs-manager': {
    class: 'Scribe',
    colors: { H: '#3e2731', C: '#9a6a45', D: '#6a4033', L: '#3a4466', F: '#262b44', T: '#9a6a45', U: '#6a4033', A: '#ead4aa', G: '#181425' },
    hat: ['', '', '...........W....', '.....HHHHHW.....'],
    outfit: [at(9, 1, 'AAA', 'AQA', 'AQA', 'AAA')],
    props: [
      [at(6, 14, 'W'), at(7, 13, 'W'), at(8, 13, 'W'), at(9, 12, 'G')],
      [at(5, 14, 'W'), at(6, 13, 'W'), at(7, 13, 'W'), at(8, 12, 'G')],
    ],
  },
  'general-purpose': {
    class: 'Adventurer',
    colors: { H: '#733e39', C: '#9bd13c', D: '#5a9a3a', L: '#733e39', F: '#3e2731', T: '#e43b44', U: '#a22633', A: '#b86f50', G: '#f4f4f4' },
    hat: ['', '', '', '', '....TTTTTTTTU...', '............U...'],
    outfit: [at(9, 2, 'AA', 'AA', 'AA'), at(9, 4, 'Q'), at(10, 5, 'Q')],
    props: [
      [blade(5), at(10, 12, 'AAA'), at(11, 13, 'Q')],
      [at(4, 13, 'G'), blade(5), at(10, 12, 'AAA'), at(11, 13, 'Q')],
    ],
  },
}

export const THEMES: Theme[] = ['party', 'wizarding']
const CASTS: Record<Theme, Record<string, Hero>> = { party: HEROES, wizarding: WIZARDING }

// An agent type no cast names ("ck:api-dev", "superpowers:code-reviewer") gets the role its name hints at.
// First match wins, so the narrow words come before the broad ones.
const HINTS: [RegExp, string][] = [
  [/secur|audit|pentest|vuln/i, 'security-auditor'],
  [/review/i, 'code-reviewer'],
  [/test|qa\b|e2e/i, 'tester'],
  [/full.?stack/i, 'fullstack-developer'],
  [/front|\bui\b|ux|css|react|vue|design/i, 'frontend-developer'],
  [/back|api|server|database|\bdb\b|sql/i, 'backend-developer'],
  [/plan|architect|brainstorm/i, 'planner'],
  [/git|commit|release|deploy|ship/i, 'git-manager'],
  [/research|analy/i, 'researcher'],
  [/explor|search|find/i, 'Explore'],
  [/scout|recon/i, 'scout'],
  [/doc|writ/i, 'docs-manager'],
]

export const roleOf = (type: string): string =>
  type in HEROES ? type : (HINTS.find(([hint]) => hint.test(type))?.[1] ?? 'general-purpose')

export const heroOf = (type: string, theme: Theme = 'party'): Hero => {
  const cast = CASTS[theme] ?? HEROES
  return cast[type] ?? cast[roleOf(type)] ?? cast['general-purpose']!
}
