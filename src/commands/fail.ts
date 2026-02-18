import chalk from "chalk";
import {
  appendLog,
  getRunningTask,
  loadState,
  saveState,
} from "../core/state.ts";

interface FailOptions {
  file: string;
  json?: boolean;
  quiet?: boolean;
}

export async function fail(
  error: string,
  options: FailOptions,
): Promise<void> {
  const state = loadState(options.file);
  const task = getRunningTask(state);

  if (!task) {
    if (options.json) {
      console.log(
        JSON.stringify({ ok: false, error: "no_running_task" }),
      );
    } else {
      console.error(chalk.red("✗"), "No task is currently running");
      console.error(`  Start one with ${chalk.bold("nanny next")}`);
    }
    process.exit(1);
  }

  const exhausted = task.attempts >= task.maxAttempts;

  task.status = "failed";
  task.lastError = error;
  task.finishedAt = new Date().toISOString();

  // If not exhausted, auto-reset to pending for next pickup
  if (!exhausted) {
    task.status = "pending";
  }

  appendLog(
    state,
    task.id,
    "fail",
    `Attempt ${task.attempts}/${task.maxAttempts}: ${error.slice(0, 200)}`,
  );
  saveState(options.file, state);

  if (options.json) {
    console.log(
      JSON.stringify({
        ok: true,
        taskId: task.id,
        attempt: task.attempts,
        maxAttempts: task.maxAttempts,
        exhausted,
        status: task.status,
      }),
    );
  } else if (!options.quiet) {
    if (exhausted) {
      console.log(
        chalk.red("✗"),
        `Task ${task.id} failed — exhausted ${task.maxAttempts} attempts`,
      );
      console.log(chalk.red(`  ${error.slice(0, 120)}`));
      console.log();
      console.log(
        `Retry with ${chalk.bold("nanny retry")} or move on with ${chalk.bold("nanny next")}`,
      );
    } else {
      console.log(
        chalk.yellow("↻"),
        `Task ${task.id} failed — will retry`,
        chalk.dim(`(${task.attempts}/${task.maxAttempts})`),
      );
      console.log(chalk.dim(`  ${error.slice(0, 120)}`));
      console.log();
      console.log(`Continue with ${chalk.bold("nanny next")}`);
    }
  }
}
