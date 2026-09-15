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
}

export function storedCount(value: number | undefined): number | undefined {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0
    ? Math.min(value, 2_147_483_647)
    : undefined;
}

export function owner(input: TurnInput) {
  return { organizationId: input.organizationId, userId: input.userId };
}
