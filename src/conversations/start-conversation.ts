import "server-only";

import { buildAgentInstructions } from "@/agents/agent-instructions";
import {
  DEFAULT_MODEL_ID,
  ensureDefaultAgent,
  getAgent,
  type OrganizationContext,
} from "@/agents/agent-repository";
import { createConversation } from "@/conversations/conversation-repository";
import { deriveConversationTitle } from "@/conversations/conversation-title";

import type { AgentKindId } from "@/agents/agent-kinds";
import type { RuntimeAgent } from "@/conversations/runtime-agent";

export type PreparedConversation =
  | { ok: false; message: string }
  | { ok: true; conversationId: string; agent: RuntimeAgent };

/**
 * Creates the conversation for a first message. The agent is the one the
 * user picked, or the organization's default agent for the mode, which Pilot
 * creates on first use.
 */
export async function startConversation(input: {
  context: OrganizationContext;
  kind: AgentKindId;
  agentId?: string;
  message: string;
}): Promise<PreparedConversation> {
  const organizationId = input.context.organization.id;
  const agent = input.agentId
    ? await getAgent(organizationId, input.agentId)
    : await ensureDefaultAgent(input.context, input.kind);
  if (!agent || agent.archived || agent.baseAgentId !== input.kind) {
    return { ok: false, message: "This agent is unavailable." };
  }
  if (agent.modelId !== DEFAULT_MODEL_ID) {
    return { ok: false, message: "This agent's model is not allowed yet." };
  }

  const conversation = await createConversation(
    { organizationId, userId: input.context.user.id },
    { agentId: agent.id, title: deriveConversationTitle(input.message) },
  );
  if (!conversation) {
    return { ok: false, message: "Pilot could not start a conversation." };
  }
  return {
    ok: true,
    conversationId: conversation.id,
    agent: {
      id: agent.id,
      instructions: buildAgentInstructions(agent),
      modelId: DEFAULT_MODEL_ID,
      baseAgentId: agent.baseAgentId,
      enabledToolIds: agent.enabledToolIds,
    },
  };
}
