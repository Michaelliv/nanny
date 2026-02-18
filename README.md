# nanny 👶

[![Tests](https://img.shields.io/github/actions/workflow/status/Michaelliv/nanny/ci.yml?label=Tests&color=brightgreen)](https://github.com/Michaelliv/nanny/actions/workflows/ci.yml) [![License](https://img.shields.io/badge/License-MIT-yellow)](https://opensource.org/licenses/MIT)

**The dumb task loop for smart agents.**

---

## The Problem

You tell your agent to "build user authentication." It starts strong, then gets lost halfway through. Forgets what it already did. Retries the wrong thing. Loses context. You come back to a mess.

The [Ralph Wiggum Loop](https://beuke.org/ralph-wiggum-loop/) showed us the fix: attempt, check, feed back errors, retry. Simple. But you need *something* to track what's done, what's next, and what failed — so the agent doesn't just spin in circles.

**nanny is that something.**

It's a task board. Your agent polls it. That's it.

---

## How It Works

```
┌─────────────────────────────────────────┐
│  Orchestration Agent (the nanny)        │
│                                         │
│  1. nanny init "build user auth"        │
│  2. nanny add --stdin < tasks.json      │
│  3. nanny next → get task               │
│  4. do the work (or delegate)           │
│  5. nanny done / nanny fail             │
│  6. goto 3                              │
└─────────────────────────────────────────┘
         │              │
    ┌────┘              └────┐
    ▼                        ▼
┌──────────┐          ┌──────────┐
│ Worker 1 │          │ Worker 2 │
│ (agent)  │          │ (agent)  │
└──────────┘          └──────────┘
```

nanny doesn't run anything. It doesn't launch agents. It doesn't have opinions about how you do the work. It just tracks:

- What needs to be done
- What's in progress
- What passed or failed
- How many times you've tried
- What the last error was

Your agent reads the state, decides what to do, and writes the result back. nanny is the clipboard on the wall.

---

## Install

```bash
npm install -g nanny-ai
```

> **Note:** The npm package is `nanny-ai` because npm's name squatter protection blocked `nanny`. The CLI command is still just `nanny`.

### Install the skill

Install the orchestration skill so your agent knows how to use nanny:

```bash
npx skills add Michaelliv/nanny
```

Or for a specific agent:

```bash
npx skills add Michaelliv/nanny --yes --agent pi
npx skills add Michaelliv/nanny --yes --agent claude-code
```

---

## Quick Start

```bash
# Create a run
nanny init "build user authentication"

# Add tasks
nanny add "create users table migration" --check "npm test"
nanny add "implement login endpoint" --check "npm test"
nanny add "add auth middleware"

# Or bulk add from JSON
echo '[
  {"description": "create users table", "check": "npm test"},
  {"description": "implement login endpoint"},
  {"description": "add auth middleware"}
]' | nanny add --stdin

# Work the loop
nanny next          # → get + claim next task
# ... do the work ...
nanny done "created users table with id, email, password_hash"

nanny next          # → next task
# ... do the work ...
nanny fail "TypeError: Cannot read property 'id' of undefined"
# task auto-requeues for retry

nanny next          # → same task again, with previousError context
# ... fix it ...
nanny done "implemented login with bcrypt and JWT"
```

---

## For Agents

Every command supports `--json`. The agent workflow is:

```bash
nanny init "goal" --json
echo '[...]' | nanny add --stdin --json
```

Then loop:

```bash
nanny next --json
```

Returns:
```json
{
  "ok": true,
  "task": {
    "id": 2,
    "description": "implement login endpoint",
    "check": { "command": "npm test" },
    "attempt": 2,
    "maxAttempts": 3,
    "previousError": "TypeError: Cannot read property 'id' of undefined"
  }
}
```

The `previousError` is the Ralph Wiggum feedback — the agent uses it to fix the issue on the next attempt.

When done:
```json
{"ok": true, "done": true, "total": 5, "completed": 5}
```

When stuck (all retries exhausted):
```json
{"ok": true, "stuck": true, "failed": [{"id": 2, "description": "...", "lastError": "..."}]}
```

### Onboard Your Agent

```bash
nanny onboard
```

Adds nanny instructions to your project's `AGENTS.md` or `.claude/CLAUDE.md`, teaching your agent the full workflow.

---

## For Humans

You'll probably never run nanny yourself. But when you want to check how your agent is doing:

```bash
$ nanny status
build user authentication

  ██████████████░░░░░░░░░░░░░░░░  3/7

  ✓ 3 done
  ▶ 1 running: implement login endpoint (attempt 2/3)
  ○ 3 pending

$ nanny list
build user authentication

  ✓ 1. create users table migration (1/3)
     Created users table with id, email, password_hash columns
  ▶ 2. implement login endpoint (2/3)
  ○ 3. add auth middleware
  ○ 4. write integration tests

$ nanny log
  11:20:45 PM ▶ [1] Attempt 1/3: create users table migration
  11:20:52 PM ✓ [1] Created users table
  11:20:56 PM ▶ [2] Attempt 1/3: implement login endpoint
  11:20:56 PM ✗ [2] Attempt 1/3: TypeError: Cannot read property 'id'
  11:21:02 PM ▶ [2] Attempt 2/3: implement login endpoint
```

---

## Commands

```
nanny init <goal>              Create a new run (--force to replace)
nanny add <description>        Add a task (--check, --stdin for bulk)
nanny next                     Get and start the next pending task
nanny done [summary]           Complete the current task
nanny fail <error>             Fail the current task
nanny retry [id]               Reset a failed task to pending
nanny status                   Progress overview
nanny list                     All tasks with status
nanny log                      Execution history
nanny onboard                  Add nanny instructions to your project
```

### Global Flags

```
--json          Structured JSON output (for agents)
-q, --quiet     Suppress non-essential output
-f, --file      State file path (default: .nanny/state.json)
```

---

## The Retry Loop

When a task fails and hasn't exhausted its retries, `nanny fail` automatically requeues it. Next time the agent calls `nanny next`, it gets the same task back — but with `previousError` in the payload.

This is the Ralph Wiggum loop: the agent's own failure output becomes context for the next attempt. Errors are data.

```
attempt 1 → fail "missing import"
attempt 2 → fail "wrong table name" (knows about missing import)
attempt 3 → done ✓ (knows about both previous errors)
```

Max attempts default to 3. Set with `--max-attempts` on `nanny init`. After exhausting retries, the task stays failed until manually reset with `nanny retry`.

---

## Task Checks

Tasks can have verification commands that the orchestrating agent reads and executes:

```bash
# Shell command check
nanny add "implement auth" --check "npm test"

# Or via JSON with agent scoring
echo '[{
  "description": "design the API",
  "check": {
    "command": "npm test",
    "agent": "review for REST best practices, score 0-100",
    "target": 80
  }
}]' | nanny add --stdin
```

nanny doesn't run checks — it just stores them. The orchestrating agent reads the check definition and decides how to verify.

---

## State

Everything lives in `.nanny/state.json`. One file. Human-readable. Add `.nanny/` to your `.gitignore`.

```
.nanny/
└── state.json    # goal, tasks, log — everything
```

---

## Philosophy

- **Dumb on purpose.** nanny is a state machine. No AI, no opinions, no magic.
- **The agent drives.** nanny tracks state. The agent decides what to do.
- **Errors are data.** Failed attempts feed into the next try.
- **One file.** No databases, no event logs, no journals. JSON in, JSON out.
- **Human-readable.** When you peek in, it should be obvious what's happening.

---

## vs Babysitter

[Babysitter](https://github.com/a5c-ai/babysitter) pioneered this space with event-sourced orchestration, hook systems, and methodology templates. It's impressive engineering.

nanny is the other end of the spectrum. No event sourcing. No hooks. No SDK. Just a task list with states that an agent polls via CLI. If babysitter is a project management suite, nanny is a sticky note on your monitor.

---

## Development

```bash
bun install
bun run src/main.ts --help
bun test
bun run build
```

---

## License

MIT

---

<p align="center">
  <b>nanny</b> — <i>the dumb task loop for smart agents</i>
</p>
