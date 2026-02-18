import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import {
  loadState,
  saveState,
  appendLog,
  getRunningTask,
  getNextPendingTask,
  getTaskById,
  nextTaskId,
} from "./state.ts";
import type { NannyState } from "./types.ts";

const TEST_FILE = ".nanny-test/state.json";

function makeState(overrides: Partial<NannyState> = {}): NannyState {
  const now = new Date().toISOString();
  return {
    version: 1,
    goal: "test goal",
    maxAttempts: 3,
    tasks: [],
    log: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  if (existsSync(".nanny-test")) rmSync(".nanny-test", { recursive: true });
});

afterEach(() => {
  if (existsSync(".nanny-test")) rmSync(".nanny-test", { recursive: true });
});

describe("saveState / loadState", () => {
  test("round-trips state", () => {
    const state = makeState({ goal: "build auth" });
    saveState(TEST_FILE, state);
    const loaded = loadState(TEST_FILE);
    expect(loaded.goal).toBe("build auth");
    expect(loaded.version).toBe(1);
  });

  test("loadState throws if file missing", () => {
    expect(() => loadState(TEST_FILE)).toThrow("No run found");
  });
});

describe("appendLog", () => {
  test("appends log entry", () => {
    const state = makeState();
    appendLog(state, 1, "start", "test message");
    expect(state.log).toHaveLength(1);
    expect(state.log[0].taskId).toBe(1);
    expect(state.log[0].event).toBe("start");
    expect(state.log[0].message).toBe("test message");
  });
});

describe("task helpers", () => {
  test("getRunningTask", () => {
    const state = makeState({
      tasks: [
        { id: 1, description: "a", status: "done", attempts: 1, maxAttempts: 3 },
        { id: 2, description: "b", status: "running", attempts: 1, maxAttempts: 3 },
      ],
    });
    expect(getRunningTask(state)?.id).toBe(2);
  });

  test("getNextPendingTask", () => {
    const state = makeState({
      tasks: [
        { id: 1, description: "a", status: "done", attempts: 1, maxAttempts: 3 },
        { id: 2, description: "b", status: "pending", attempts: 0, maxAttempts: 3 },
        { id: 3, description: "c", status: "pending", attempts: 0, maxAttempts: 3 },
      ],
    });
    expect(getNextPendingTask(state)?.id).toBe(2);
  });

  test("getTaskById", () => {
    const state = makeState({
      tasks: [
        { id: 1, description: "a", status: "pending", attempts: 0, maxAttempts: 3 },
        { id: 5, description: "b", status: "pending", attempts: 0, maxAttempts: 3 },
      ],
    });
    expect(getTaskById(state, 5)?.description).toBe("b");
    expect(getTaskById(state, 99)).toBeUndefined();
  });

  test("nextTaskId", () => {
    expect(nextTaskId(makeState())).toBe(1);
    expect(
      nextTaskId(
        makeState({
          tasks: [
            { id: 1, description: "a", status: "done", attempts: 1, maxAttempts: 3 },
            { id: 3, description: "b", status: "pending", attempts: 0, maxAttempts: 3 },
          ],
        }),
      ),
    ).toBe(4);
  });
});
