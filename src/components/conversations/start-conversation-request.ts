import { readJson } from "@/lib/read-json";

import type { AgentKindId } from "@/agents/agent-kinds";

const FAILURE_MESSAGE = "Pilot could not start a conversation.";

/**
 * Creates the conversation for a first message and queues that message so
 * the conversation page streams it on load. Returns where to navigate.
 */
export async function startConversationRequest(input: {
  kind: AgentKindId;
  prompt: string;
  agentId: string | undefined;
}) {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await readJson<{
    conversationId?: string;
    href?: string;
    error?: string;
  }>(response);
  if (!response.ok || !payload.conversationId || !payload.href) {
    throw new Error(payload.error ?? FAILURE_MESSAGE);
  }
  sessionStorage.setItem(
    `pilot:initial-message:${payload.conversationId}`,
    input.prompt,
  );
  return payload.href;
}

export function startFailureMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : FAILURE_MESSAGE;
}
