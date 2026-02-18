import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { LogEntry, NannyState, Task } from "./types.ts";

export function loadState(filePath: string): NannyState {
  if (!existsSync(filePath)) {
    throw new Error(`No run found. Run 'nanny init <goal>' first.`);
  }
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export function saveState(filePath: string, state: NannyState): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  state.updatedAt = new Date().toISOString();
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

export function appendLog(
  state: NannyState,
  taskId: number,
  event: LogEntry["event"],
  message: string,
): void {
  state.log.push({
    timestamp: new Date().toISOString(),
    taskId,
    event,
    message,
  });
}

export function getRunningTask(state: NannyState): Task | undefined {
  return state.tasks.find((t) => t.status === "running");
}

export function getNextPendingTask(state: NannyState): Task | undefined {
  return state.tasks.find((t) => t.status === "pending");
}

export function getTaskById(state: NannyState, id: number): Task | undefined {
  return state.tasks.find((t) => t.id === id);
}

export function nextTaskId(state: NannyState): number {
  if (state.tasks.length === 0) return 1;
  return Math.max(...state.tasks.map((t) => t.id)) + 1;
}
