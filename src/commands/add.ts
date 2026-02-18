import chalk from "chalk";
import type { Task, TaskCheck } from "../core/types.ts";
import { loadState, nextTaskId, saveState } from "../core/state.ts";

interface AddOptions {
  file: string;
  json?: boolean;
  quiet?: boolean;
  check?: string;
  checkAgent?: string;
  target?: string;
  stdin?: boolean;
}

interface StdinTask {
  description: string;
  check?: TaskCheck | string;
}

export async function add(
  description: string | undefined,
  options: AddOptions,
): Promise<void> {
  const state = loadState(options.file);

  if (options.stdin) {
    const input = await readStdin();
    const parsed = JSON.parse(input) as StdinTask[];

    if (!Array.isArray(parsed)) {
      if (options.json) {
        console.log(
          JSON.stringify({ ok: false, error: "invalid_input", message: "Expected JSON array" }),
        );
      } else {
        console.error(chalk.red("✗"), "Expected a JSON array of tasks");
      }
      process.exit(1);
    }

    const added: Task[] = [];
    for (const item of parsed) {
      const task = createTask(
        state.tasks,
        nextTaskId(state) + added.length,
        typeof item === "string" ? item : item.description,
        resolveCheck(typeof item === "string" ? undefined : item.check),
        state.maxAttempts,
      );
      added.push(task);
    }
    state.tasks.push(...added);
    saveState(options.file, state);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, added: added.length, tasks: added }));
    } else if (!options.quiet) {
      console.log(chalk.green("✓"), `Added ${added.length} task(s)`);
      for (const t of added) {
        console.log(chalk.dim(`  ${t.id}. ${t.description}`));
      }
      console.log();
      console.log(`Start with ${chalk.bold("nanny next")}`);
    }
    return;
  }

  if (!description) {
    if (options.json) {
      console.log(
        JSON.stringify({ ok: false, error: "missing_description" }),
      );
    } else {
      console.error(chalk.red("✗"), "Task description required");
      console.error(`  Usage: ${chalk.bold("nanny add <description>")}`);
      console.error(`  Bulk:  ${chalk.bold('echo \'[{"description": "..."}]\' | nanny add --stdin')}`);
    }
    process.exit(1);
  }

  const check = buildCheck(options);
  const id = nextTaskId(state);
  const task = createTask(state.tasks, id, description, check, state.maxAttempts);
  state.tasks.push(task);
  saveState(options.file, state);

  if (options.json) {
    console.log(JSON.stringify({ ok: true, task }));
  } else if (!options.quiet) {
    console.log(chalk.green("✓"), `Task ${id} added`);
    console.log(chalk.dim(`  ${description}`));
    if (check) {
      if (check.command) console.log(chalk.dim(`  Check: ${check.command}`));
      if (check.agent) console.log(chalk.dim(`  Scorer: ${check.agent}`));
    }
  }
}

function createTask(
  _existing: Task[],
  id: number,
  description: string,
  check: TaskCheck | undefined,
  maxAttempts: number,
): Task {
  return {
    id,
    description,
    ...(check ? { check } : {}),
    status: "pending",
    attempts: 0,
    maxAttempts,
  };
}

function buildCheck(options: AddOptions): TaskCheck | undefined {
  if (!options.check && !options.checkAgent) return undefined;
  const check: TaskCheck = {};
  if (options.check) check.command = options.check;
  if (options.checkAgent) check.agent = options.checkAgent;
  if (options.target) check.target = Number.parseInt(options.target, 10);
  return check;
}

function resolveCheck(
  check: TaskCheck | string | undefined,
): TaskCheck | undefined {
  if (!check) return undefined;
  if (typeof check === "string") return { command: check };
  return check;
}

async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  const reader = Bun.stdin.stream().getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value, { stream: true }));
  }
  return chunks.join("");
}
