import chalk from "chalk";
import {
  appendLog,
  getRunningTask,
  loadState,
  saveState,
} from "../core/state.ts";

interface DoneOptions {
  file: string;
  json?: boolean;
  quiet?: boolean;
}

export async function done(
  summary: string | undefined,
  options: DoneOptions,
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

  task.status = "done";
  task.finishedAt = new Date().toISOString();
  if (summary) task.summary = summary;

  appendLog(
    state,
    task.id,
    "done",
    summary ?? `Task ${task.id} completed`,
  );
  saveState(options.file, state);

  const pending = state.tasks.filter((t) => t.status === "pending");
  const total = state.tasks.length;
  const completed = state.tasks.filter((t) => t.status === "done").length;

  if (options.json) {
    console.log(
      JSON.stringify({
        ok: true,
        taskId: task.id,
        completed,
        total,
        remaining: pending.length,
      }),
    );
  } else if (!options.quiet) {
    console.log(chalk.green("✓"), `Task ${task.id} done`, chalk.dim(`(${completed}/${total})`));
    if (summary) {
      console.log(chalk.dim(`  ${summary.slice(0, 120)}`));
    }
    if (pending.length > 0) {
      console.log();
      console.log(`Next: ${chalk.bold("nanny next")}`);
    } else if (completed === total) {
      console.log();
      console.log(chalk.green("🎉 All tasks complete!"));
    }
  }
}
