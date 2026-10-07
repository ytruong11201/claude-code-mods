# Agent Party

A Claude Code mod that turns every subagent you spawn into a 16×16 pixel hero in a band above the prompt.

**[▶ Try the live demo](https://ytruong11201.github.io/claude-code-mods/agent-party/)**. It draws the same sprites and speech bubbles the mod draws in your terminal. The browser copy lives in [`docs/agent-party/`](../../docs/agent-party/index.html); rebuild it with `demo/build.sh ../../docs/agent-party/index.html`.

```
 ▄██▄        ╭────────────────────────────────╮
 █▀▀█        │ Plan the product search page   │
 ▀██▀        │ Reading product.service.ts     │
 ▀  ▀        ╰────────────────────────────────╯
              planner the Wizard · Lv 12
              ⏱ 10m 7s · ↓ 231.3k tokens
```

- A hero appears with a poof when its agent is spawned, bobs while it works, and hops with sparkles when it finishes. If the agent is stopped, the hero is knocked out (grey). It leaves the stage 20 seconds after it finishes.
- When it finishes, the bubble says what it brought back: `Done ✓ · 4 files · 2 test runs · 1 error` (files it edited or wrote, test suites it ran, tool calls that failed).
- An agent spawned by another agent stands under its parent as a small familiar (`↳ Explore the Ranger`), and under it any it spawned in turn. It joins the main row once its parent has left the stage.
- The speech bubble shows the agent's task, and below it what the agent is doing right now, from its latest tool call.
- The level goes up by one with each tool call. The timer and token count update as the agent works.
- Each tool call that comes back as an error costs the hero a heart (♥♥♥♥♡) and makes it flash red.
- A hero with no tool running and no model step for 2 minutes shows `💦 Quiet for 2m, stuck?`. The same tool call with the same input 3 times in a row shows `🔁 … ×3`. The voice says when an agent seems stuck.
- The status line under the prompt sums up the party (`⚔ 2 running · ✓ 1 done · 💦 1 stuck?`). It shows on every surface, also when the band is hidden.
- A voice tells you who started and who finished. While an agent works, it gives at most one status line per agent every 45 seconds.

Tested with Claude Code v2.1.289. The mods API can change between releases.

## Commands

| Command | What it does |
|---|---|
| `/agent-theme` | Switches between the two casts. `/agent-theme party` or `/agent-theme wizarding` picks one. Your choice is saved across sessions. |
| `/agent-voice` | Turns the voice on or off |
| `/agent-size` | `auto` (default), `large` (16×16), `medium` (12×12), `small` (8×8) or `line` (one row per agent, no sprite). `auto` shrinks the heroes as the party grows or the window narrows |
| `/agent-outline` | `thin` (default: ink only on the shadow side, below and right), `dark` (ink all round) or `none` |
| `/agent-log` | Opens the Quest Log pane: every agent of this session, the running ones first, then the finished ones newest first, with time, tokens, what each brought back and who summoned it. It keeps the last 100 quests |
| `/agent-cast` | Picks the hero for an agent type: `/agent-cast my-agent=code-reviewer`. `/agent-cast my-agent=` undoes one, `/agent-cast reset` clears all, `/agent-cast` lists the roles and your picks |

With no argument, `/agent-theme`, `/agent-size` and `/agent-outline` step to the next option. Every choice is saved across sessions.

## Casts

| Agent type | `party` (default) | `wizarding` |
|---|---|---|
| planner | Wizard | Headmaster |
| backend-developer | Dwarf Smith | Groundskeeper |
| frontend-developer | Bard | Charms Student |
| fullstack-developer | Paladin | Broom Rider |
| tester | Alchemist | Potions Master |
| code-reviewer | Knight | Professor |
| security-auditor | Rogue | Dark Arts Defender |
| git-manager | Courier | Post Owl |
| researcher | Sage | Library Prefect |
| Explore | Ranger | Night Explorer |
| scout | Scout | Castle Ghost |
| docs-manager | Scribe | Talking Portrait |
| any other type | the role its name hints at, else Adventurer | the role its name hints at, else First-Year |

An agent type the table doesn't name plays the role its name hints at: `superpowers:code-reviewer` is a Knight, `api-dev` a Dwarf Smith, `e2e-runner` an Alchemist, `ui-designer` a Bard. `/agent-cast` overrides the guess.

The wizarding cast is made of original archetypes, not characters from any book or film.

![The wizarding cast in every pose](../../assets/wizarding-cast.png)

Each row in the image shows one hero, with these frames from left to right:
- working, with its idle bob and blink
- victory hop
- knocked out
- the two spawn frames

## How it works

| | |
|---|---|
| Pixels | One terminal cell holds two pixels: an upper half block `▀` coloured with the top pixel and backed by the bottom one. A hero is 16 columns × 8 rows, 12 × 6 at `medium` and 8 × 4 at `small`. |
| Surfaces | The terminal draws the sprite as a `Raster` of half blocks. The desktop app, VS Code and the mobile app draw the same pixels as an `Svg`. `line` size and the status line are plain text, so they work everywhere. |
| Smaller sprites | 12×12 drops rows and columns 0, 5, 10 and 15 of the 16×16 art, which loses no feature. 8×8 takes each 2×2 block: an eye wins its block, a block less than half covered stays empty, otherwise the commonest colour. The outline goes on last, at the drawn size. |
| Animation | 4 fps. The work loop steps every 250 ms and the idle bob every 500 ms. A blink comes every 4 s. |
| Hooks | `agent.spawn` puts a hero on stage. `tool.call` fills the speech bubble and, from its result, takes a heart on an error. `turn.step` counts tokens, and `turn.complete` ends the quest. |
| Voice | Uses Claude Code's system speech (`say` on macOS). If that fails, it falls back to `spd-say` on Linux. If neither works, it turns the voice off and shows a notice. |
| Art | Sprites are data in `hooks/heroes.ts` and `hooks/heroes-wizarding.ts`. `hooks/art.ts` combines a shared body with each class's hat, outfit and prop, then adds the animation and a 1px outline. |

The design follows common pixel-art practice for 16×16 characters:
- chibi proportions, with a big head on a short body
- a full dark outline, so heroes read on dark and light terminals
- 5–7 colours per sprite, lit from the top left
- class colours from the [Endesga 32](https://lospec.com/palette-list/endesga-32) and [Sweetie 16](https://lospec.com/palette-list/sweetie-16) palettes

## Develop

```bash
claude --plugin-dir ./plugins/agent-party   # edits reload as you save
claude plugin validate ./plugins/agent-party
claude plugin test ./plugins/agent-party
```

The browser demo is built from the same art files. Running `demo/build.sh <out.html>` writes a single-file HTML page with a scripted quest and the full roster. It needs Node.js, and it fetches esbuild through `npx`.
