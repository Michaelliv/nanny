export type TaskStatus = "pending" | "running" | "done" | "failed";

export interface TaskCheck {
  /** Shell command to verify (e.g. "npm test") */
  command?: string;
  /** Prompt for an agent scorer */
  agent?: string;
  /** Score threshold (0-100) for agent checks */
  target?: number;
}

export interface Task {
  id: number;
  description: string;
  check?: TaskCheck;
  status: TaskStatus;
  attempts: number;
  maxAttempts: number;
  summary?: string;
  lastError?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface LogEntry {
  timestamp: string;
  taskId: number;
  event: "start" | "done" | "fail" | "retry";
  message: string;
}

export interface NannyState {
  version: 1;
  goal: string;
  maxAttempts: number;
  tasks: Task[];
  log: LogEntry[];
  createdAt: string;
  updatedAt: string;
}
