import { z } from "zod";

import { getConversationInstructions } from "@/conversations/conversation-repository";
import { listConversationMemories } from "@/memory/memory-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

/**
 * This conversation's own instructions and remembered notes, for the
 * conversation actions menu's "Memory & instructions" dialog.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
  const { conversationId: rawConversationId } = await params;
  const conversationId = z.uuid().safeParse(rawConversationId);
  if (!conversationId.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };

  const [instructions, memories] = await Promise.all([
    getConversationInstructions(owner, conversationId.data),
    listConversationMemories(
      session.organizationId,
      session.user.id,
      conversationId.data,
    ),
  ]);

  return Response.json({
    instructions,
    memories: memories.map((memory) => ({
      id: memory.id,
      content: memory.content,
    })),
  });
}
