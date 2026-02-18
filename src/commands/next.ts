import chalk from "chalk";
import {
  appendLog,
  getNextPendingTask,
  getRunningTask,
  loadState,
  saveState,
} from "../core/state.ts";

interface NextOptions {
  file: string;
  json?: boolean;
  quiet?: boolean;
}

export async function next(options: NextOptions): Promise<void> {
  const state = loadState(options.file);

  // Already have a running task
  const running = getRunningTask(state);
  if (running) {
    if (options.json) {
      console.log(
        JSON.stringify({
          ok: true,
          task: running,
          resumed: true,
        }),
      );
    } else {
      console.log(chalk.yellow("▶"), `Task ${running.id} is already running`);
      console.log(chalk.dim(`  ${running.description}`));
      console.log();
      console.log(
        `Complete with ${chalk.bold("nanny done")} or ${chalk.bold("nanny fail")}`,
      );
    }
    return;
  }

  // Get next pending task
  const task = getNextPendingTask(state);

  if (!task) {
    const failed = state.tasks.filter((t) => t.status === "failed");
    const done = state.tasks.filter((t) => t.status === "done");

    if (done.length === state.tasks.length) {
      // All done
      if (options.json) {
        console.log(
          JSON.stringify({
            ok: true,
            done: true,
            total: state.tasks.length,
            completed: done.length,
          }),
        );
      } else {
        console.log(chalk.green("✓"), `All ${state.tasks.length} tasks complete.`);
      }
      return;
    }

    if (failed.length > 0) {
      // Stuck
      if (options.json) {
        console.log(
          JSON.stringify({
            ok: true,
            stuck: true,
            failed: failed.map((t) => ({
              id: t.id,
              description: t.description,
              attempts: t.attempts,
              lastError: t.lastError,
            })),
          }),
        );
      } else {
        console.log(
          chalk.red("✗"),
          `Stuck — ${failed.length} task(s) failed`,
        );
        for (const t of failed) {
          console.log(
            chalk.dim(`  ${t.id}. ${t.description} (${t.attempts} attempts)`),
          );
          if (t.lastError) {
            console.log(chalk.red(`     ${t.lastError.slice(0, 120)}`));
          }
        }
        console.log();
        console.log(
          `Retry with ${chalk.bold("nanny retry")} or ${chalk.bold("nanny retry <id>")}`,
        );
      }
      process.exit(1);
    }

    // No tasks at all
    if (options.json) {
      console.log(JSON.stringify({ ok: true, done: true, total: 0, completed: 0 }));
    } else {
      console.log(chalk.dim("No tasks. Add some with"), chalk.bold("nanny add"));
    }
    return;
  }

  // Claim the task
  task.status = "running";
  task.attempts += 1;
  task.startedAt = new Date().toISOString();
  appendLog(state, task.id, "start", `Attempt ${task.attempts}/${task.maxAttempts}: ${task.description}`);
  saveState(options.file, state);

  if (options.json) {
    console.log(
      JSON.stringify({
        ok: true,
        task: {
          id: task.id,
          description: task.description,
          ...(task.check ? { check: task.check } : {}),
          attempt: task.attempts,
          maxAttempts: task.maxAttempts,
          ...(task.lastError ? { previousError: task.lastError } : {}),
        },
      }),
    );
  } else if (!options.quiet) {
    console.log(chalk.blue("▶"), `Task ${task.id}: ${task.description}`);
    if (task.check?.command) {
      console.log(chalk.dim(`  Check: ${task.check.command}`));
    }
    if (task.check?.agent) {
      console.log(chalk.dim(`  Scorer: ${task.check.agent}`));
    }
    console.log(
      chalk.dim(`  Attempt: ${task.attempts}/${task.maxAttempts}`),
    );
    if (task.lastError) {
      console.log(chalk.red(`  Previous error: ${task.lastError.slice(0, 120)}`));
    }
  }
}
