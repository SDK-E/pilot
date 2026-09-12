import "server-only";

export type EffectIntentStatus =
  "prepared" | "dispatched" | "confirmed" | "failed" | "unknown";

export interface EffectResult {
  status: EffectIntentStatus;
  externalRef?: string;
  payload?: Record<string, unknown>;
  error?: string;
  reconciliationRequired: boolean;
}

export interface EffectIntent {
  id: string;
  organizationId: string;
  proposalId: string;
  approvalId?: string;
  effectKey: string;
  externalRef?: string;
  status: EffectIntentStatus;
  result?: EffectResult;
  dispatchedAt?: Date;
  confirmedAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReconciliationResult {
  intentId: string;
  handleMatch: boolean;
  stateMatch: boolean;
  resolvedStatus: EffectIntentStatus;
  reason: string;
}

export function createEffectIntent(input: {
  organizationId: string;
  proposalId: string;
  approvalId?: string;
  effectKey: string;
  externalRef?: string;
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}): EffectIntent {
  return {
    id: input.id ?? crypto.randomUUID(),
    organizationId: input.organizationId,
    proposalId: input.proposalId,
    approvalId: input.approvalId,
    effectKey: input.effectKey,
    externalRef: input.externalRef,
    status: "prepared",
    createdAt: input.createdAt ?? new Date(),
    updatedAt: input.updatedAt ?? new Date(),
  };
}

export function buildEffectKey(input: {
  actorId: string;
  actionType: string;
  targetRef: string;
  argsHash: string;
}): string {
  return `efk_${input.actorId}_${input.actionType}_${input.targetRef}_${input.argsHash}`;
}

export function transitionEffectStatus(
  intent: EffectIntent,
  status: EffectIntentStatus,
  result?: EffectResult,
): EffectIntent {
  const now = new Date();
  const updated: EffectIntent = {
    ...intent,
    status,
    updatedAt: now,
    result,
  };

  switch (status) {
    case "dispatched":
      updated.dispatchedAt = now;
      break;
    case "confirmed":
      updated.confirmedAt = now;
      updated.externalRef = result?.externalRef ?? intent.externalRef;
      break;
    case "failed":
      updated.failedAt = now;
      updated.result = result ?? {
        status: "failed",
        reconciliationRequired: false,
        error: intent.result?.error ?? "External effect failed",
      };
      break;
    case "unknown":
      updated.result = result ?? {
        status: "unknown",
        reconciliationRequired: true,
        error: "External state could not be verified",
      };
      break;
  }

  return updated;
}

export function isTerminalStatus(status: EffectIntentStatus): boolean {
  return status === "confirmed" || status === "failed";
}

export function isRetryable(status: EffectIntentStatus): boolean {
  return status === "prepared" || status === "dispatched";
}
