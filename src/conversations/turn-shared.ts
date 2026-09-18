import "server-only";

import { finishAgentRun } from "@/executions/agent-run-repository";

import type { RuntimeAgent } from "@/conversations/runtime-agent";

export interface TurnInput {
  organizationId: string;
  userId: string;
  agent: RuntimeAgent;
  conversationId: string;
  message: string;
  /*
   * Continue: append this turn's reply onto an existing stopped message.
   */
  appendToMessageId?: string;
  /**
   * The message's explicit connector on-set (composer per-message toggle).
   * Omitted means every available connector stays on. See
   * `MessageToolOverrides` in `tool-authorization.ts`.
   */
  requestedConnectorToolIds?: readonly string[];
  /**
   * Skills active for this message, resolved into extra instructions and
   * tool grants before the runtime request is built.
   */
  activeSkillIds?: readonly string[];
  /**
   * The full desired attachment set for the message being created —
   * already-uploaded ids to parent onto it once it exists. See
   * `attachConversationAttachmentsToMessage`.
   */
  attachmentIds?: readonly string[];
  /**
   * Set only by `/api/cron/continue-runs`: the `agent_runs` row this turn
   * resumes, so `startAgentRun` re-points that same row at this chunk's new
   * execution instead of opening a second one. See ADR-0026.
   */
  continuingRunId?: string;
  /**
   * An explicit per-message model pick from the composer's model picker — a
   * selector string (`gw:...`, `byok:...`, or a bare model id). Omitted
   * means fall back to the org's `primaryModelId` preference, subject to
   * usage-limit-driven BYOK substitution — see `model-plan.ts`.
   */
  requestedModelId?: string;
}

export function storedCount(value: number | undefined): number | undefined {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0
    ? Math.min(value, 2_147_483_647)
    : undefined;
}

export function owner(input: TurnInput) {
  return { organizationId: input.organizationId, userId: input.userId };
}

/**
 * Closes the durable run record opened for this turn (see `startAgentRun`
 * in `beginTurn`) — every agent kind gets one.
 */
export async function finishTurnAgentRun(
  input: TurnInput,
  turn: { execution: { id: string } },
  errorMessage?: string,
) {
  await finishAgentRun({
    organizationId: input.organizationId,
    executionId: turn.execution.id,
    errorMessage,
  });
}
