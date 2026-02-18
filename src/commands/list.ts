import chalk from "chalk";
import { loadState } from "../core/state.ts";

interface ListOptions {
  file: string;
  json?: boolean;
  quiet?: boolean;
}

const STATUS_ICON: Record<string, string> = {
  done: chalk.green("✓"),
  failed: chalk.red("✗"),
  running: chalk.blue("▶"),
  pending: chalk.dim("○"),
};

export async function list(options: ListOptions): Promise<void> {
  const state = loadState(options.file);

  if (options.json) {
    console.log(JSON.stringify({ goal: state.goal, tasks: state.tasks }));
    return;
  }

  if (state.tasks.length === 0) {
    console.log(chalk.dim("No tasks."));
    console.log(`Add some with ${chalk.bold("nanny add")}`);
    return;
  }

  console.log(chalk.bold(state.goal));
  console.log();

  for (const task of state.tasks) {
    const icon = STATUS_ICON[task.status] ?? "?";
    const attempts =
      task.attempts > 0
        ? chalk.dim(` (${task.attempts}/${task.maxAttempts})`)
        : "";

    console.log(`  ${icon} ${task.id}. ${task.description}${attempts}`);

    if (task.status === "done" && task.summary) {
      console.log(chalk.green(`     ${task.summary.slice(0, 120)}`));
    }
    if (task.status === "failed" && task.lastError) {
      console.log(chalk.red(`     ${task.lastError.slice(0, 120)}`));
    }
  }
}
