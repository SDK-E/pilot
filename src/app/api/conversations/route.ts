import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
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

export async function POST(request: Request) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return Response.json(
      { error: "Choose an organization before starting a chat." },
      { status: 403 },
    );
  }
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) {
    return Response.json(
      { error: "Your organization access is no longer active." },
      { status: 403 },
    );
  }
  const input = inputSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!input.success)
    return Response.json({ error: "A message is required." }, { status: 400 });
  const prepared = await prepareConversation({
    organizationId,
    membership,
    user: { id: user.id, email: user.email },
    message: input.data.prompt,
    workerId: input.data.workerId,
  });
  if (!prepared.ok)
    return Response.json({ error: prepared.message }, { status: 400 });
  return Response.json(
    {
      conversationId: prepared.conversation.id,
      href: `/workspace/workers/${prepared.worker.id}/conversations/${prepared.conversation.id}`,
    },
    { status: 201 },
  );
}
