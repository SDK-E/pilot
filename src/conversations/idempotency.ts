export interface IdempotencyKey {
  ownerId: string;
  conversationId: string;
  clientRequestId: string;
}

export function makeIdempotencyKey(input: {
  ownerId: string;
  conversationId: string;
  clientRequestId: string;
}): string {
  return [input.ownerId, input.conversationId, input.clientRequestId]
    .map((s) => s.toLowerCase())
    .join(":");
}

export interface PendingRun {
  idempotencyKey: string;
  runId: string;
  startedAt: Date;
  status: "running" | "completed" | "failed" | "suspended";
}

export interface SubmitIntent {
  clientRequestId: string;
  message: string;
  workerId: string;
  conversationId: string;
  ownerId: string;
}

export function isSameSubmitIntent(a: SubmitIntent, b: SubmitIntent): boolean {
  return (
    a.ownerId === b.ownerId &&
    a.conversationId === b.conversationId &&
    a.clientRequestId === b.clientRequestId &&
    a.message === b.message
  );
}
