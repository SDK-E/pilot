import { z } from "zod";

import { listConversationMessages } from "@/conversations/conversation-repository";
import { listMessageSources } from "@/conversations/message-sources";
import { errorResponse } from "@/lib/http";
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
 * The owner's transcript, fetched by the browser once a stream has closed.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };

  const { conversationId: rawConversationId } = await params;
  const conversationId = z.uuid().safeParse(rawConversationId);
  if (!conversationId.success) {
    return errorResponse("Conversation not found.", 404);
  }
  const messages = await listConversationMessages(owner, conversationId.data);
  if (!messages) return errorResponse("Conversation not found.", 404);
  const sources = await listMessageSources({
    ...owner,
    conversationId: conversationId.data,
  });
  return Response.json(
    {
      messages: messages.map((message) => ({
        ...message,
        sources: sources.filter((source) => source.messageId === message.id),
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
