import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { listConversationActivity } from "@/executions/execution-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { conversationId } = await params;
  const parsedConversationId = z.uuid().safeParse(conversationId);
  if (!parsedConversationId.success) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

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

  const activities = await listConversationActivity(
    organizationId,
    parsedConversationId.data,
    user.id,
  );
  return Response.json(
    { activities },
    { headers: { "cache-control": "no-store" } },
  );
}
