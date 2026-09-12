import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { streamConversationMessage } from "@/conversations/stream-message";
import { prepareConversation } from "@/conversations/start-chat";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

export const runtime = "nodejs";

const inputSchema = z.object({
  prompt: z.string().trim().min(1).max(10_000),
  workerId: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.uuid().optional(),
  ),
});

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return error("Choose an organization before sending a message.", 403);
  }
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) {
    return error("Your organization access is no longer active.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON.", 400);
  }
  const input = inputSchema.safeParse(body);
  if (!input.success) return error("A message is required.", 400);

  const prepared = await prepareConversation({
    organizationId,
    membership,
    user: { id: user.id, email: user.email },
    message: input.data.prompt,
    workerId: input.data.workerId,
  });
  if (!prepared.ok) return error(prepared.message, 400);

  const stream = await streamConversationMessage({
    organizationId,
    worker: prepared.worker,
    conversationId: prepared.conversation.id,
    userId: user.id,
    message: input.data.prompt,
    signal: request.signal,
  });
  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/plain; charset=utf-8",
      location: `/workspace/workers/${prepared.worker.id}/conversations/${prepared.conversation.id}`,
      "x-pilot-conversation-href": `/workspace/workers/${prepared.worker.id}/conversations/${prepared.conversation.id}`,
    },
  });
}
