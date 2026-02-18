import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";

interface OnboardOptions {
  file?: string;
  json?: boolean;
  quiet?: boolean;
}

const NANNY_INSTRUCTIONS = `
<nanny>
Use \`nanny\` to orchestrate multi-step tasks. Nanny is a lightweight task state machine — you drive the loop, it tracks state.

<workflow>
1. \`nanny init "goal" --json\` — Create a run (use \`--force\` to replace existing)
2. \`echo '[{"description": "..."}]' | nanny add --stdin --json\` — Add tasks (bulk JSON)
3. \`nanny next --json\` — Get and claim the next pending task
4. Perform the task (run code, delegate to sub-agent, etc.)
5. \`nanny done "summary" --json\` or \`nanny fail "error" --json\` — Record result
6. Repeat from step 3 until \`nanny next\` returns \`{"ok":true,"done":true}\`
</workflow>

<commands>
- \`nanny init <goal> --json\` — Create a run (\`--force\` to replace, \`--max-attempts <n>\` for retries)
- \`nanny add <desc> --json\` — Add a single task (\`--check "npm test"\` for verification command)
- \`nanny add --stdin --json\` — Bulk add from JSON array on stdin
- \`nanny next --json\` — Get + start next task (returns task with previousError on retries)
- \`nanny done "summary" --json\` — Complete the running task
- \`nanny fail "error" --json\` — Fail the running task (auto-requeues if under max attempts)
- \`nanny retry [id] --json\` — Reset an exhausted failed task to pending
- \`nanny status --json\` — Progress overview
- \`nanny list --json\` — All tasks with status
- \`nanny log --json\` — Execution history
</commands>

<task-format>
When adding tasks via \`--stdin\`, pipe a JSON array:
\`\`\`json
[
  {"description": "create users table", "check": "npm test"},
  {"description": "implement endpoint"},
  {"description": "verify coverage", "check": {"command": "npm test", "agent": "check coverage > 80%", "target": 80}}
]
\`\`\`
</task-format>

<retry-loop>
When \`nanny next --json\` returns a task with \`previousError\`, use that error as context to fix the issue.
The Ralph Wiggum loop: attempt → check → feed back errors → retry. Failures are data.
</retry-loop>

<rules>
- ALWAYS use \`--json\` flag for structured output
- ALWAYS call \`nanny next\` to claim a task before working on it
- ALWAYS call \`nanny done\` or \`nanny fail\` after each task — never leave a task running
- When \`nanny next\` returns \`done: true\`, the run is complete — stop looping
- When \`nanny next\` returns \`stuck: true\`, decide whether to \`nanny retry\` or report to the user
- Do not write to \`.nanny/state.json\` directly — always use the CLI
</rules>
</nanny>
`.trim();

const MARKER = "<nanny>";

export async function onboard(options: OnboardOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const claudeDir = join(cwd, ".claude");
  const claudeMd = join(claudeDir, "CLAUDE.md");
  const agentsMd = join(cwd, "AGENTS.md");

  // Find target: prefer existing AGENTS.md, then .claude/CLAUDE.md, then create .claude/CLAUDE.md
  let targetFile: string;
  if (existsSync(agentsMd)) {
    targetFile = agentsMd;
  } else if (existsSync(claudeMd)) {
    targetFile = claudeMd;
  } else {
    targetFile = claudeMd;
  }

  let existingContent = "";
  if (existsSync(targetFile)) {
    existingContent = readFileSync(targetFile, "utf-8");
  }

  // Idempotent
  if (existingContent.includes(MARKER)) {
    if (options.json) {
      console.log(
        JSON.stringify({
          ok: true,
          file: targetFile,
          status: "already_onboarded",
        }),
      );
    } else if (!options.quiet) {
      console.log(chalk.green("✓"), "Already onboarded");
      console.log(chalk.dim(`  ${targetFile}`));
    }
    return;
  }

  // Ensure directory exists for .claude/CLAUDE.md
  const targetDir = join(targetFile, "..");
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (existingContent) {
    writeFileSync(
      targetFile,
      `${existingContent.trimEnd()}\n\n${NANNY_INSTRUCTIONS}\n`,
    );
  } else {
    writeFileSync(targetFile, `${NANNY_INSTRUCTIONS}\n`);
  }

  if (options.json) {
    console.log(JSON.stringify({ ok: true, file: targetFile }));
  } else if (!options.quiet) {
    console.log(
      chalk.green("✓"),
      `Added nanny instructions to ${chalk.bold(targetFile)}`,
    );
    console.log();
    console.log(chalk.dim("Your agent now knows how to use nanny!"));
  }
}
