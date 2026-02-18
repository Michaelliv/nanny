import chalk from "chalk";
import {
  appendLog,
  getTaskById,
  loadState,
  saveState,
} from "../core/state.ts";

interface RetryOptions {
  file: string;
  json?: boolean;
  quiet?: boolean;
}

export async function retry(
  idArg: string | undefined,
  options: RetryOptions,
): Promise<void> {
  const state = loadState(options.file);

  let task;

  if (idArg) {
    const id = Number.parseInt(idArg, 10);
    task = getTaskById(state, id);
    if (!task) {
      if (options.json) {
        console.log(JSON.stringify({ ok: false, error: "not_found", id }));
      } else {
        console.error(chalk.red("✗"), `Task ${id} not found`);
      }
      process.exit(1);
    }
  } else {
    // Default: last failed task
    const failed = state.tasks.filter((t) => t.status === "failed");
    if (failed.length === 0) {
      if (options.json) {
        console.log(
          JSON.stringify({ ok: false, error: "no_failed_tasks" }),
        );
      } else {
        console.error(chalk.red("✗"), "No failed tasks to retry");
      }
      process.exit(1);
    }
    task = failed[failed.length - 1];
  }

  if (task.status !== "failed") {
    if (options.json) {
      console.log(
        JSON.stringify({
          ok: false,
          error: "not_failed",
          id: task.id,
          status: task.status,
        }),
      );
    } else {
      console.error(
        chalk.red("✗"),
        `Task ${task.id} is ${task.status}, not failed`,
      );
    }
    process.exit(1);
  }

  task.status = "pending";
  task.attempts = 0;

  appendLog(state, task.id, "retry", `Reset to pending for retry`);
  saveState(options.file, state);

  if (options.json) {
    console.log(JSON.stringify({ ok: true, taskId: task.id }));
  } else if (!options.quiet) {
    console.log(chalk.green("↻"), `Task ${task.id} reset to pending`);
    console.log(chalk.dim(`  ${task.description}`));
    console.log();
    console.log(`Pick it up with ${chalk.bold("nanny next")}`);
  }
}
