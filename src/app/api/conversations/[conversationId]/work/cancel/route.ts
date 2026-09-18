import { z } from "zod";

import { getConversation } from "@/conversations/conversation-repository";
import { loadRuntimeAgent } from "@/conversations/runtime-agent";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";
import { didCancelWorkRun } from "@/work/work-run-repository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

/**
 * Cancels the active Work run for this conversation. Work-only: a Chat or
 * Code conversation never has a `work_runs` row, so this always reports
 * nothing to cancel for them. See ADR-0025 for what cancellation does and
 * does not guarantee today.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);

  const { conversationId: rawConversationId } = await params;
  const conversationId = z.uuid().safeParse(rawConversationId);
  if (!conversationId.success) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };
  const conversation = await getConversation(owner, conversationId.data);
  const agent = conversation
    ? await loadRuntimeAgent(
        owner.organizationId,
        conversation.agentId,
        owner.userId,
      )
    : undefined;
  if (!conversation || !agent) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }
  if (agent.baseAgentId !== "work") {
    return Response.json(
      { error: "Only a Work conversation can be cancelled this way." },
      { status: 400 },
    );
  }

  const wasCancelled = await didCancelWorkRun({
    organizationId: owner.organizationId,
    conversationId: conversationId.data,
  });
  return Response.json({ wasCancelled });
}
