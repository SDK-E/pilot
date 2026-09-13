import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import {
  getConversation,
  listConversationMessages,
} from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { listMessageSources } from "@/conversations/research-evidence";

export const runtime = "nodejs";

const workerIdSchema = z.uuid();

type RouteContext = { params: Promise<{ conversationId: string }> };

/** Returns the current owner's rendered chat records after a stream completes. */
export async function GET(request: Request, { params }: RouteContext) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return Response.json(
      { error: "Choose an organization first." },
      { status: 403 },
    );
  }
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) {
    return Response.json(
      { error: "Your organization access is no longer active." },
      { status: 403 },
    );
  }

  const { conversationId } = await params;
  const parsedConversationId = z.uuid().safeParse(conversationId);
  const parsedWorkerId = workerIdSchema.safeParse(
    new URL(request.url).searchParams.get("workerId"),
  );
  if (!parsedConversationId.success || !parsedWorkerId.success) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  const conversation = await getConversation(
    organizationId,
    parsedWorkerId.data,
    parsedConversationId.data,
    user.id,
  );
  if (!conversation) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  const messages = await listConversationMessages(
    organizationId,
    parsedWorkerId.data,
    parsedConversationId.data,
    user.id,
  );
  if (!messages) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  const sources = await listMessageSources({
    organizationId,
    conversationId: parsedConversationId.data,
    userId: user.id,
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
