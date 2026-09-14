import { z } from "zod";

import {
  createConversationMessage,
  getConversation,
} from "@/conversations/conversation-repository";
import { loadRuntimeAgent } from "@/conversations/runtime-agent";
import { startExecution } from "@/executions/execution-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

// TEMPORARY bisection: exercise the two writes beginTurn() performs
// (createConversationMessage, startExecution) with no streamMessage/
// ReadableStream involved, to see if the crash is in these DB writes.
export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };
  const { conversationId: rawConversationId } = await params;
  const conversationId = z.uuid().parse(rawConversationId);
  const conversation = await getConversation(owner, conversationId);
  const agent = conversation
    ? await loadRuntimeAgent(owner.organizationId, conversation.agentId)
    : undefined;
  if (!conversation || !agent)
    return Response.json({ error: "no conversation/agent" }, { status: 404 });

  const userMessage = await createConversationMessage(owner, {
    conversationId,
    role: "user",
    content: "diag write bisect",
  });
  const execution = userMessage
    ? await startExecution({
        organizationId: owner.organizationId,
        workerId: agent.id,
        conversationId,
      })
    : undefined;
  return Response.json({
    messageWritten: !!userMessage,
    executionWritten: !!execution,
  });
}
