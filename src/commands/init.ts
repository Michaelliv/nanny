import { existsSync, rmSync } from "node:fs";
import chalk from "chalk";
import type { NannyState } from "../core/types.ts";
import { loadState, saveState } from "../core/state.ts";

interface InitOptions {
  file: string;
  json?: boolean;
  quiet?: boolean;
  maxAttempts: string;
  force?: boolean;
}

export async function init(
  goal: string,
  options: InitOptions,
): Promise<void> {
  const filePath = options.file;

  if (existsSync(filePath) && !options.force) {
    const existing = loadState(filePath);
    const counts = {
      total: existing.tasks.length,
      done: existing.tasks.filter((t) => t.status === "done").length,
      failed: existing.tasks.filter((t) => t.status === "failed").length,
      running: existing.tasks.filter((t) => t.status === "running").length,
      pending: existing.tasks.filter((t) => t.status === "pending").length,
    };

    if (options.json) {
      console.log(
        JSON.stringify({
          ok: false,
          error: "run_exists",
          goal: existing.goal,
          ...counts,
          hint: "Use --force to replace the existing run.",
        }),
      );
    } else {
      console.error(
        chalk.red("✗"),
        `A run already exists: ${chalk.bold(existing.goal)}`,
      );
      console.error(
        chalk.dim(
          `  ${counts.done}/${counts.total} done, ${counts.failed} failed, ${counts.running} running, ${counts.pending} pending`,
        ),
      );
      console.error();
      console.error(
        `  Use ${chalk.bold("nanny init --force")} to replace it.`,
      );
      console.error(
        `  Use ${chalk.bold("nanny status")} to check the current run.`,
      );
    }
    process.exit(1);
  }

  if (existsSync(filePath) && options.force) {
    rmSync(filePath);
  }

  const now = new Date().toISOString();
  const state: NannyState = {
    version: 1,
    goal,
    maxAttempts: Number.parseInt(options.maxAttempts, 10),
    tasks: [],
    log: [],
    createdAt: now,
    updatedAt: now,
  };

  saveState(filePath, state);

  if (options.json) {
    console.log(JSON.stringify({ ok: true, goal, file: filePath }));
  } else if (!options.quiet) {
    console.log(chalk.green("✓"), "Run created");
    console.log(chalk.dim(`  Goal: ${goal}`));
    console.log(chalk.dim(`  File: ${filePath}`));
    console.log();
    console.log(
      `Add tasks with ${chalk.bold("nanny add")} or pipe JSON with ${chalk.bold("nanny add --stdin")}`,
    );
  }
}
