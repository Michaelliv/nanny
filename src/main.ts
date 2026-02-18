#!/usr/bin/env bun

import { Command } from "commander";
import { version } from "../package.json";
import { init } from "./commands/init.ts";
import { add } from "./commands/add.ts";
import { next } from "./commands/next.ts";
import { done } from "./commands/done.ts";
import { fail } from "./commands/fail.ts";
import { retry } from "./commands/retry.ts";
import { status } from "./commands/status.ts";
import { list } from "./commands/list.ts";
import { log } from "./commands/log.ts";
import { onboard } from "./commands/onboard.ts";

const program = new Command();

program
  .name("nanny")
  .description("Lightweight AI agent task orchestrator")
  .version(version)
  .option("--json", "Structured JSON output")
  .option("-q, --quiet", "Suppress non-essential output")
  .option(
    "-f, --file <path>",
    "State file path",
    ".nanny/state.json",
  );

program
  .command("init")
  .description("Create a new run")
  .argument("<goal>", "What needs to be accomplished")
  .option("--max-attempts <n>", "Max attempts per task", "3")
  .option("--force", "Replace existing run")
  .action((goal, opts) => init(goal, { ...program.opts(), ...opts }));

program
  .command("add")
  .description("Add a task")
  .argument("[description]", "Task description")
  .option("--check <command>", "Shell command to verify (e.g. npm test)")
  .option("--check-agent <prompt>", "Agent scorer prompt")
  .option("--target <n>", "Score threshold for agent check (0-100)")
  .option("--stdin", "Read tasks from JSON stdin")
  .action((description, opts) =>
    add(description, { ...program.opts(), ...opts }),
  );

program
  .command("next")
  .description("Get and start the next pending task")
  .action((opts) => next({ ...program.opts(), ...opts }));

program
  .command("done")
  .description("Complete the current task")
  .argument("[summary]", "Summary of what was done")
  .action((summary, opts) => done(summary, { ...program.opts(), ...opts }));

program
  .command("fail")
  .description("Fail the current task")
  .argument("<error>", "What went wrong")
  .action((error, opts) => fail(error, { ...program.opts(), ...opts }));

program
  .command("retry")
  .description("Reset a failed task to pending")
  .argument("[id]", "Task ID (defaults to last failed)")
  .action((id, opts) => retry(id, { ...program.opts(), ...opts }));

program
  .command("status")
  .description("Progress overview")
  .action((opts) => status({ ...program.opts(), ...opts }));

program
  .command("list")
  .description("All tasks with status")
  .action((opts) => list({ ...program.opts(), ...opts }));

program
  .command("log")
  .description("Execution history")
  .option("-n, --lines <n>", "Number of entries to show", "20")
  .action((opts) => log({ ...program.opts(), ...opts }));

program
  .command("onboard")
  .description("Add nanny instructions to your agent config")
  .action((opts) => onboard({ ...program.opts(), ...opts }));

program.parse();
