"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteConversationMemory } from "@/ai/pilot-ai-client";
import { listConversations } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { deleteWorker } from "@/workers/worker-repository";

export type DeletePersonaState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export async function deletePersonaAction(
  _previousState: DeletePersonaState,
  formData: FormData,
): Promise<DeletePersonaState> {
  const id = z.uuid().safeParse(formData.get("workerId"));
  if (!id.success) {
    return { status: "error", message: "This persona is unavailable." };
  }
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return { status: "error", message: "Choose an organization first." };
  }
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) {
    return {
      status: "error",
      message: "Your organization access is no longer active.",
    };
  }

  try {
    const conversations = await listConversations(organizationId, id.data);
    for (const conversation of conversations) {
      await deleteConversationMemory({
        organizationId,
        workerId: id.data,
        conversationId: conversation.id,
      });
    }
    const deleted = await deleteWorker(organizationId, id.data);
    if (!deleted) {
      return { status: "error", message: "This persona is unavailable." };
    }
  } catch {
    return {
      status: "error",
      message: "Pilot could not delete this persona. Try again.",
    };
  }

  revalidatePath("/workspace");
  revalidatePath("/workspace/personas");
  revalidatePath("/workspace/fleet");
  return { status: "success", message: "Persona deleted." };
}
