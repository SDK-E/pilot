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
// A turn can legitimately run up to STREAM_TIMEOUT_MS (90s in
// conversation-turn.ts) plus a fallback-model retry — most visibly with the
// code-sandbox tool, whose real VM boot and command execution routinely push
// a turn past the platform's default function duration. Without this, the
// function is killed mid-stream before that timeout ever fires, and the
// platform's own generic crash page becomes the "response" the client reads
// as if it were streamed reply text.
export const maxDuration = 180;

const inputSchema = z.object({ prompt: z.string().trim().min(1).max(10_000) });

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
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

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await streamMessage(
      {
        ...owner,
        agent,
        conversationId: conversation.id,
        message: input.data.prompt,
      },
      request.signal,
    );
  } catch (streamError) {
    // beginTurn (inside streamMessage) can throw before any bytes are sent
    // (e.g. the conversation is unavailable, or it's already mid-turn). A
    // clean error response here, instead of letting the exception escape
    // uncaught, is what keeps the client from ever reading a raw platform
    // crash page as if it were a streamed reply.
    // eslint-disable-next-line no-console -- only path to surface this server-side
    console.error("Stream route failed to start a turn:", {
      name: streamError instanceof Error ? streamError.name : "unknown",
    });
    return error("Pilot could not start this response.", 502);
  }
  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
