export type ExecutionStatus =
  | "queued"
  | "running"
  | "waiting_user"
  | "waiting_approval"
  | "cancelling"
  | "cancelled"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "unknown";

export interface ExecutionV2 {
  id: string;
  organizationId: string;
  workerId: string;
  conversationId: string;
  requestId?: string;
  budgetId?: string;
  parentExecutionId?: string;
  status: ExecutionStatus;
  attempts: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface DurableRun {
  executionId: string;
  runId: string;
  status: ExecutionStatus;
  requestId: string;
  conversationId: string;
  organizationId: string;
  workerId: string;
  startedAt: Date;
  completedAt: Date | null;
  attempts: DurableAttempt[];
}

export interface DurableAttempt {
  attemptNumber: number;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt: Date | null;
  result?: DurableAttemptResult;
}

export interface DurableAttemptResult {
  outcome: "completed" | "failed" | "cancelled" | "timed_out" | "suspended";
  message?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export function executionStatusIsTerminal(status: ExecutionStatus): boolean {
  return (
    status === "succeeded" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "timed_out" ||
    status === "unknown"
  );
}

export function executionStatusIsActive(status: ExecutionStatus): boolean {
  return (
    status === "queued" ||
    status === "running" ||
    status === "waiting_user" ||
    status === "waiting_approval" ||
    status === "cancelling"
  );
}

export function normalizeExecutionStatus(status: string): ExecutionStatus {
  if (status === "completed") return "succeeded";
  return status as ExecutionStatus;
}
