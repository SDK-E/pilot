import { z } from "zod";

import { getConversation } from "@/conversations/conversation-repository";
import { didCancelAgentRun } from "@/executions/agent-run-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

/**
 * Cancels the active run for this conversation, for any agent kind. See
 * ADR-0025/ADR-0026 for what cancellation does and does not guarantee today.
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
  if (!conversation) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  const wasCancelled = await didCancelAgentRun({
    organizationId: owner.organizationId,
    conversationId: conversationId.data,
  });
  return Response.json({ wasCancelled });
}
