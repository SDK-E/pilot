export type CloseReason =
  "browser_close" | "explicit_cancel" | "error" | "timeout";

export interface ReconnectCursor {
  conversationId: string;
  lastEventId: string;
  lastSequence: number;
  executionId: string;
}

export interface SnapshotRecovery {
  executionId: string;
  messages: Array<{
    messageId: string;
    role: "user" | "worker";
    parts: unknown[];
  }>;
  lastSequence: number;
  lastEventId: string;
}

export interface ResumeResult {
  executionId: string;
  runId?: string;
  status: "resumed" | "interrupted" | "retry";
  retryMessage?: string;
}

export interface CancelIntent {
  executionId: string;
  conversationId: string;
  requestId?: string;
}

export interface InterruptedRun {
  executionId: string;
  runId?: string;
  reason: "runtime_unavailable" | "cursor_invalid" | "duplicate_sequence";
  retryable: boolean;
  retryRunId?: string;
}

export function isRecoverable(interrupted: InterruptedRun): boolean {
  return interrupted.retryable;
}

export function closeReasonFromSignal(signal: AbortSignal): CloseReason {
  if (signal.aborted) return "explicit_cancel";
  return "error";
}
