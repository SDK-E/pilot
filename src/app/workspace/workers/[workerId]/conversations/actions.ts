"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createConversation } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

const workerIdSchema = z.uuid();

export async function startConversationAction(workerId: string) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (
    !organizationId ||
    !/^org_[a-zA-Z0-9]+$/.test(organizationId) ||
    !workerIdSchema.safeParse(workerId).success
  ) {
    redirect("/workspace");
  }

  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) redirect("/workspace");

  const conversation = await createConversation({
    organizationId,
    workerId,
    createdByWorkosUserId: user.id,
  });
  if (!conversation) redirect("/workspace");

  redirect(`/workspace/workers/${workerId}/conversations/${conversation.id}`);
}
