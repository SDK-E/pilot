"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteConversation } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

export async function deleteConversationAction(formData: FormData) {
  const input = z
    .object({ workerId: z.uuid(), conversationId: z.uuid() })
    .safeParse({
      workerId: formData.get("workerId"),
      conversationId: formData.get("conversationId"),
    });
  if (!input.success) return;
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) return;
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) return;
  await deleteConversation(
    organizationId,
    input.data.workerId,
    input.data.conversationId,
  );
  revalidatePath("/workspace/chats");
}
