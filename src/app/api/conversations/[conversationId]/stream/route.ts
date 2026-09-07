import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { streamConversationMessage } from "@/conversations/stream-message";
import { getConversation } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getWorker } from "@/workers/worker-repository";

export const runtime = "nodejs";

const inputSchema = z.object({
  prompt: z.string().trim().min(1).max(10_000),
  workerId: z.uuid(),
});

type RouteContext = { params: Promise<{ conversationId: string }> };

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { conversationId } = await params;
  const parsedConversationId = z.uuid().safeParse(conversationId);
  if (!parsedConversationId.success)
    return error("Conversation not found.", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON.", 400);
  }
  const input = inputSchema.safeParse(body);
  if (!input.success) return error("A message is required.", 400);

  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return error("Choose an organization before sending a message.", 403);
  }
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) {
    return error("Your organization access is no longer active.", 403);
  }
  const [worker, conversation] = await Promise.all([
    getWorker(organizationId, input.data.workerId),
    getConversation(
      organizationId,
      input.data.workerId,
      parsedConversationId.data,
    ),
  ]);
  if (!worker || !conversation || worker.modelId !== "kilo/kilo-auto/free") {
    return error("This conversation is unavailable.", 404);
  }

  const stream = await streamConversationMessage({
    organizationId,
    worker: {
      id: worker.id,
      instructions: worker.instructions,
      modelId: "kilo/kilo-auto/free",
    },
    conversationId: conversation.id,
    message: input.data.prompt,
    signal: request.signal,
  });
  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
