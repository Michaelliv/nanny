import chalk from "chalk";
import { loadState } from "../core/state.ts";

interface LogOptions {
  file: string;
  lines: string;
  json?: boolean;
  quiet?: boolean;
}

const EVENT_STYLE: Record<string, (s: string) => string> = {
  start: chalk.blue,
  done: chalk.green,
  fail: chalk.red,
  retry: chalk.yellow,
};

const EVENT_ICON: Record<string, string> = {
  start: "▶",
  done: "✓",
  fail: "✗",
  retry: "↻",
};

export async function log(options: LogOptions): Promise<void> {
  const state = loadState(options.file);
  const n = Number.parseInt(options.lines, 10);
  const entries = state.log.slice(-n);

  if (options.json) {
    console.log(JSON.stringify({ entries }));
    return;
  }

  if (entries.length === 0) {
    console.log(chalk.dim("No log entries."));
    return;
  }

  for (const entry of entries) {
    const icon = EVENT_ICON[entry.event] ?? " ";
    const style = EVENT_STYLE[entry.event] ?? chalk.dim;
    const time = new Date(entry.timestamp).toLocaleTimeString();

    console.log(
      `  ${chalk.dim(time)} ${style(icon)} ${chalk.dim(`[${entry.taskId}]`)} ${entry.message}`,
    );
  }
}
