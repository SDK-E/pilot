import { z } from "zod";

import { getConversation } from "@/conversations/conversation-repository";
import { loadRuntimeAgent } from "@/conversations/runtime-agent";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

// TEMPORARY bisection: return after conversation + agent load, before
// streamMessage, to isolate whether those DB reads are the crash point.
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
  return Response.json({
    conversationFound: !!conversation,
    agentFound: !!agent,
  });
}
