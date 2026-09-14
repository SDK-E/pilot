import { z } from "zod";

import { getConversation } from "@/conversations/conversation-repository";
import { streamMessage } from "@/conversations/conversation-turn";
import { loadRuntimeAgent } from "@/conversations/runtime-agent";
import { errorResponse as error, readJsonBody } from "@/lib/http";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

const inputSchema = z.object({ prompt: z.string().trim().min(1).max(10_000) });

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

// TEMPORARY: diagnosing a production 500 on this route (2026-09-14). vercel
// logs does not surface this project's function stdout, so the detail is
// returned in the body instead. Revert once root-caused.
function diagResponse(streamError: unknown) {
  return Response.json(
    {
      diagName:
        streamError instanceof Error ? streamError.name : typeof streamError,
      diagMessage:
        streamError instanceof Error
          ? streamError.message
          : String(streamError),
      diagStack:
        streamError instanceof Error
          ? streamError.stack?.slice(0, 2000)
          : undefined,
    },
    { status: 500 },
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await getWorkspaceSession();
    if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
    const owner = {
      organizationId: session.organizationId,
      userId: session.user.id,
    };

    const { conversationId: rawConversationId } = await params;
    const conversationId = z.uuid().safeParse(rawConversationId);
    if (!conversationId.success) return error("Conversation not found.", 404);
    const input = inputSchema.safeParse(await readJsonBody(request));
    if (!input.success) return error("A message is required.", 400);

    const conversation = await getConversation(owner, conversationId.data);
    const agent = conversation
      ? await loadRuntimeAgent(owner.organizationId, conversation.agentId)
      : undefined;
    if (!conversation || !agent)
      return error("This conversation is unavailable.", 404);

    const stream = await streamMessage(
      {
        ...owner,
        agent,
        conversationId: conversation.id,
        message: input.data.prompt,
      },
      request.signal,
    );
    return new Response(stream, {
      headers: {
        "cache-control": "no-cache, no-transform",
        "content-type": "text/plain; charset=utf-8",
      },
    });
  } catch (streamError) {
    return diagResponse(streamError);
  }
}
