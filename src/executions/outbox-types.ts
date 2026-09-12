export type OutboxEventStatus =
  "pending" | "dispatched" | "reconciled" | "failed";

export interface OutboxEvent {
  id: string;
  executionId: string;
  type: string;
  payload: unknown;
  status: OutboxEventStatus;
  dispatchedAt: Date | null;
  attempts: number;
  lastDispatchedAt: Date | null;
  createdAt: Date;
}

export interface DispatcherHandle {
  runId: string;
  executionId: string;
  status: "active" | "completed" | "failed" | "cancelled";
  dispatchedAt: Date;
}

export interface ReconciliationResult {
  executionId: string;
  handleMatch: boolean;
  stateMatch: boolean;
  resolvedStatus: string;
  reason: string;
}

export interface ReconcileInput {
  executionId: string;
  handle: DispatcherHandle | null;
  durableStatus: string;
  runtimeStatus: string;
}

export function reconcile(input: ReconcileInput): ReconciliationResult {
  const handleMatch = input.handle !== null;
  const stateMatch = input.durableStatus === input.runtimeStatus;

  let resolvedStatus = input.durableStatus;
  let reason = "states match";

  if (!handleMatch) {
    resolvedStatus = "unknown";
    reason = "no handle found; runtime result present but dispatch record lost";
  } else if (!stateMatch) {
    resolvedStatus = input.runtimeStatus;
    reason = "durable state repaired to match runtime state";
  }

  return {
    executionId: input.executionId,
    handleMatch,
    stateMatch,
    resolvedStatus,
    reason,
  };
}

export function outboxEventIsReadyForDispatch(event: OutboxEvent): boolean {
  return event.status === "pending";
}

export function outboxEventMarkDispatched(event: OutboxEvent): OutboxEvent {
  return {
    ...event,
    status: "dispatched",
    dispatchedAt: new Date(),
    attempts: event.attempts + 1,
    lastDispatchedAt: new Date(),
  };
}

export function outboxEventMarkReconciled(event: OutboxEvent): OutboxEvent {
  return { ...event, status: "reconciled" };
}

export function outboxEventMarkFailed(event: OutboxEvent): OutboxEvent {
  return { ...event, status: "failed", attempts: event.attempts + 1 };
}
