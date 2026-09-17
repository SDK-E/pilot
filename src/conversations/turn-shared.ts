import "server-only";

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
}

export function storedCount(value: number | undefined): number | undefined {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0
    ? Math.min(value, 2_147_483_647)
    : undefined;
}

export function owner(input: TurnInput) {
  return { organizationId: input.organizationId, userId: input.userId };
}
