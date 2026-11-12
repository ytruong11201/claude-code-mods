# english-coach

Turns everyday prompting into English writing practice. After you send a prompt, a small model rewrites your English the way a native engineer would type it and shows the result above the prompt box. Your prompt goes to Claude unchanged and without delay, and the coaching never enters Claude's context.

```
✎ Can you check why the login test fails on CI?
↑ Could you look into why the login test is failing on CI?
💡 "why login test is fail" → "why the login test fails" — no "is" before a verb
```

When your English is already natural, it shows nothing. Slash commands, short prompts (under 6 words) and code, paths, shell lines and logs are skipped.

## Commands

| Command | What it does |
|---|---|
| `/english-coach [on\|off]` | Turns coaching on or off. With no argument it toggles. |
| `/english-review` | Reviews your last 60 coached prompts: your top 3 recurring mistakes, five phrases to start using, and a 5-question drill built from your own sentences. The review prints in the transcript, not in Claude's context. |

Coaching runs on Haiku (one short call per prompt); the review runs on Sonnet. Both are billed to your Claude Code credentials. History (the last 300 coached prompts) is kept in the mod's own store.

## Install

Mods need Claude Code v2.1.287 or later (`claude --version`).

From a Claude Code session:

```text
/plugin install english-coach --marketplace ytruong11201/claude-code-mods
```

Or from your shell:

```bash
claude plugin marketplace add ytruong11201/claude-code-mods
claude plugin install english-coach@nyt-mods --scope user
```

`--scope user` loads it in every project. Run `/reload-plugins` in an open session, or start a new one.
