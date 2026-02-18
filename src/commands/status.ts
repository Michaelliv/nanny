import chalk from "chalk";
import { getRunningTask, loadState } from "../core/state.ts";

interface StatusOptions {
  file: string;
  json?: boolean;
  quiet?: boolean;
}

export async function status(options: StatusOptions): Promise<void> {
  const state = loadState(options.file);

  const counts = {
    total: state.tasks.length,
    done: state.tasks.filter((t) => t.status === "done").length,
    failed: state.tasks.filter((t) => t.status === "failed").length,
    pending: state.tasks.filter((t) => t.status === "pending").length,
    running: state.tasks.filter((t) => t.status === "running").length,
  };

  const running = getRunningTask(state);

  if (options.json) {
    console.log(
      JSON.stringify({
        goal: state.goal,
        ...counts,
        ...(running
          ? {
              currentTask: {
                id: running.id,
                description: running.description,
                attempt: running.attempts,
                maxAttempts: running.maxAttempts,
              },
            }
          : {}),
      }),
    );
    return;
  }

  console.log(chalk.bold(state.goal));
  console.log();

  if (counts.total === 0) {
    console.log(chalk.dim("  No tasks yet."));
    console.log();
    console.log(`Add tasks with ${chalk.bold("nanny add")}`);
    return;
  }

  const bar = renderBar(counts.done, counts.failed, counts.total);
  console.log(`  ${bar}  ${counts.done}/${counts.total}`);
  console.log();

  if (running) {
    console.log(
      chalk.blue(`  ▶ running: ${running.description}`),
      chalk.dim(`(attempt ${running.attempts}/${running.maxAttempts})`),
    );
  }
  if (counts.done > 0) {
    console.log(chalk.green(`  ✓ ${counts.done} done`));
  }
  if (counts.failed > 0) {
    console.log(chalk.red(`  ✗ ${counts.failed} failed`));
  }
  if (counts.pending > 0) {
    console.log(chalk.dim(`  ○ ${counts.pending} pending`));
  }

  if (counts.done === counts.total) {
    console.log();
    console.log(chalk.green("  🎉 All tasks complete!"));
  }
}

function renderBar(
  done: number,
  failed: number,
  total: number,
): string {
  const width = 30;
  if (total === 0) return chalk.dim("░".repeat(width));

  const doneW = Math.round((done / total) * width);
  const failW = Math.round((failed / total) * width);
  const restW = width - doneW - failW;

  return (
    chalk.green("█".repeat(doneW)) +
    chalk.red("█".repeat(failW)) +
    chalk.dim("░".repeat(Math.max(0, restW)))
  );
}
