// The wizarding-school cast: original archetypes (no named characters). Same slots as heroes.ts;
// three of them bring their own body (an owl, a ghost, a portrait). Scarves use four house-style pairs.
import type { Hero, Layer } from './heroes'

const at = (row: number, col: number, ...rows: string[]): Layer => ({ at: [row, col], rows })
const wand = [at(8, 13, 'G'), at(9, 13, 'Q'), at(10, 13, 'Q')]
const wandSpell = [at(6, 14, 'A'), at(7, 13, 'A'), at(8, 13, 'W'), at(9, 13, 'Q'), at(10, 13, 'Q'), at(5, 12, 'A')]
const scarf = at(9, 4, 'XYXYXYXY')
const robe = { C: '#3a4466', D: '#262b44', L: '#262b44', F: '#181425' }

const OWL = [
  '................', '................', '................', '....U......U....',
  '....UCCCCCCU....', '...CCCCCCCCCC...', '...CWWWCCWWWC...', '...CWeWCCWeWC...',
  '...CWWWAAWWWC...', '..DCCCCAACCCCD..', '..DCBBBBBBBBCD..', '..DCBBBBBBBBCD..',
  '...DCBBBBBBCD...', '....DDDDDDDD....', '.....AA..AA.....', '................',
]
const GHOST = [
  '................', '................', '................', '.....CCCCCC.....',
  '....CCCCCCCC....', '....CCCCCCCC....', '....CCeCCeCC....', '....CCCCCCCC....',
  '...CCCCDDCCCC...', '...CCCCCCCCCC...', '..CCCCCCCCCCCC..', '...CCCCCCCCCC...',
  '...CCCCCCCCCC...', '...CC.CCCC.CC...', '................', '................',
]
const PORTRAIT = [
  '................', '..AAAAAAAAAAAA..', '..AXXXXXXXXXXA..', '..AXXXHHHHXXXA..',
  '..AXXHHHHHHXXA..', '..AXXHssssHXXA..', '..AXXHesseHXXA..', '..AXXHssssHXXA..',
  '..AXXXSSSSXXXA..', '..AXXCCCCCCXXA..', '..AXCCCCCCCCXA..', '..AXCCCCCCCCXA..',
  '..AAAAAAAAAAAA..', '......AAAA......', '................', '................',
]

export const WIZARDING: Record<string, Hero> = {
  planner: {
    class: 'Headmaster',
    colors: { H: '#c0cbdc', B: '#e6e9ef', C: '#8f5fd0', D: '#5b3f9e', L: '#5b3f9e', F: '#3e2731', T: '#8f5fd0', U: '#5b3f9e', A: '#fee761', G: '#2ce8f5' },
    hat: ['', '.........T......', '........TAT.....', '......TATTTU....', '...UUUUUUUUUU...', '', '....sMeMMeMS....', '....BBBBBBBB....', '.....BBBBBB.....', '......BBBB......', '.......BB.......'],
    props: [wand, wandSpell],
  },
  'backend-developer': {
    class: 'Groundskeeper',
    colors: { H: '#3e2731', B: '#5d3a2e', C: '#9a6a45', D: '#6a4033', L: '#3e2731', F: '#181425', A: '#feae34', G: '#fee761' },
    hat: ['', '', '....H.HH.H......', '....HHHHHHHH....', '...HHHHHHHHHH...', '...HHssssssHH...', '...HHsessesHH...', '....BBBBBBBB....', '....BBBBBBBB....', '.....BBBBBB.....'],
    props: [
      [at(8, 13, 'Q'), at(9, 12, 'QAQ', 'QGQ', '.Q.')],
      [at(8, 13, 'Q'), at(9, 12, 'QGQ', 'QWQ', '.Q.'), at(7, 14, 'A'), at(8, 11, 'A')],
    ],
  },
  'frontend-developer': {
    class: 'Charms Student',
    colors: { ...robe, H: '#b86f50', X: '#c42430', Y: '#feae34', A: '#fee761', G: '#f4f4f4' },
    hat: [],
    outfit: [scarf, at(10, 9, 'X', 'Y')],
    props: [wand, wandSpell],
  },
  'fullstack-developer': {
    class: 'Broom Rider',
    colors: { ...robe, H: '#feae34', X: '#124e89', Y: '#c28569', A: '#e4a672', G: '#2ce8f5' },
    hat: ['', '', '', '', '....MGGMMGGM....'],
    outfit: [scarf, at(10, 9, 'X', 'Y')],
    props: [
      [at(3, 13, 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'), at(12, 12, 'AAA'), at(13, 12, 'A.A')],
      [at(3, 13, 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'), at(12, 12, 'AAA'), at(13, 12, '.AA'), at(14, 14, 'A')],
    ],
  },
  tester: {
    class: 'Potions Master',
    colors: { H: '#262b44', C: '#4a3f63', D: '#2c2840', L: '#2c2840', F: '#181425', K: '#5a6988', G: '#63c74d', A: '#a7f070' },
    hat: ['', '', '', '.....HHHHHH.....', '....HHHHHHHH....', '....HssssssH....', '....HsessesH....', '....HssssssH....', '....HSSSSSSH....'],
    props: [
      [at(10, 11, 'GGGG', 'KKKK', 'KKKK', '.KK.'), at(8, 12, 'W'), at(7, 13, 'W')],
      [at(10, 11, 'GAGG', 'KKKK', 'KKKK', '.KK.'), at(8, 13, 'W'), at(6, 12, 'W'), at(9, 14, 'A')],
    ],
  },
  'code-reviewer': {
    class: 'Professor',
    colors: { H: '#8b9bb4', C: '#3e8948', D: '#265c42', L: '#265c42', F: '#181425', T: '#265c42', U: '#193c3e', A: '#e43b44', G: '#f4f4f4' },
    hat: ['', '........TT......', '.......TTT......', '......TTTTU.....', '..UUUUUUUUUUUU..', '', '....sMeMMeMS....'],
    outfit: [at(10, 1, 'WW', 'WW')],
    props: [wand, [...wandSpell.slice(1), at(6, 14, 'A'), at(5, 13, 'A')]],
  },
  'security-auditor': {
    class: 'Dark Arts Defender',
    colors: { H: '#3e2731', C: '#a22633', D: '#5d1a2a', L: '#262b44', F: '#181425', A: '#41a6f6', G: '#73eff7' },
    hat: ['', '', '', '.....HHHHHH.....', '....HHHHHHHH....', '....HssssssH....'],
    props: [
      [at(7, 13, 'G'), at(8, 13, 'Q'), at(9, 13, 'Q')],
      [at(4, 14, 'A', 'A', 'A', 'A', 'A', 'A'), at(3, 13, 'A'), at(10, 13, 'A'), at(7, 13, 'G'), at(8, 13, 'Q'), at(9, 13, 'Q')],
    ],
  },
  'git-manager': {
    class: 'Post Owl',
    body: OWL,
    colors: { C: '#b86f50', D: '#733e39', U: '#733e39', B: '#ead4aa', A: '#feae34', G: '#e43b44' },
    hat: [],
    props: [
      [at(13, 5, 'WWGWWW')],
      [at(13, 5, 'WWGWWW'), at(7, 1, 'D'), at(8, 1, 'DD'), at(7, 14, 'D'), at(8, 13, 'DD')],
    ],
  },
  researcher: {
    class: 'Library Prefect',
    colors: { ...robe, H: '#9a6a45', X: '#c42430', Y: '#feae34', A: '#a22633', K: '#124e89', G: '#ead4aa' },
    hat: ['', '', '....H.HHH.H.....', '...HHHHHHHHH....', '...HHHHHHHHHH...', '...HHssssssHH...', '...HssessesSH...', '...HsssssssSH...', '...HHSSSSSSHH...'],
    outfit: [scarf],
    props: [
      [at(10, 2, 'AAAA', 'GGGG', 'KKKK')],
      [at(9, 3, 'GG'), at(10, 2, 'AGGA', 'GGGG', 'KKKK')],
    ],
  },
  Explore: {
    class: 'Night Explorer',
    colors: { ...robe, H: '#3e2731', X: '#fee761', Y: '#262b44', A: '#ead4aa', G: '#fee761' },
    hat: [],
    outfit: [scarf],
    props: [
      [at(10, 4, 'AAAAAAA', 'AQAAAAA', 'AAAAQAA'), at(7, 13, 'G'), at(8, 13, 'Q'), at(9, 13, 'Q')],
      [at(10, 4, 'AAAAAAA', 'AAQAAAA', 'AAAAAQA'), at(6, 13, 'G'), at(7, 12, 'G'), at(7, 14, 'G'), at(8, 13, 'Q'), at(9, 13, 'Q')],
    ],
  },
  scout: {
    class: 'Castle Ghost',
    body: GHOST,
    colors: { C: '#cfe9f5', D: '#8bb5cc', A: '#cfe9f5', e: '#3a4466' },
    hat: [],
    props: [[at(14, 4, 'C..CC..C')], [at(14, 4, '.C.CC.C.')]],
  },
  'docs-manager': {
    class: 'Talking Portrait',
    body: PORTRAIT,
    colors: { A: '#c4862a', X: '#262b44', H: '#9a6a45', C: '#8f5fd0' },
    hat: [],
    props: [[], [at(8, 7, 'QQ')]],
  },
  'general-purpose': {
    class: 'First-Year',
    colors: { ...robe, H: '#733e39', X: '#fee761', Y: '#262b44', A: '#fee761', G: '#f4f4f4' },
    hat: ['', '', '.....H.H.H......'],
    outfit: [scarf],
    props: [wand, wandSpell],
  },
}
WIZARDING.Plan = WIZARDING.planner!
