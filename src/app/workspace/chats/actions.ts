"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteConversationMemory } from "@/ai/pilot-ai-client";
import {
  deleteConversation,
  renameConversation,
} from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

export type DeleteConversationState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export type RenameConversationState = DeleteConversationState;

export async function renameConversationAction(
  _previousState: RenameConversationState,
  formData: FormData,
): Promise<RenameConversationState> {
  const input = z
    .object({
      workerId: z.uuid(),
      conversationId: z.uuid(),
      title: z.string().trim().min(1).max(200),
    })
    .safeParse({
      workerId: formData.get("workerId"),
      conversationId: formData.get("conversationId"),
      title: formData.get("title"),
    });
  if (!input.success) {
    return { status: "error", message: "Enter a conversation title." };
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

  const renamed = await renameConversation({
    organizationId,
    workerId: input.data.workerId,
    conversationId: input.data.conversationId,
    userId: user.id,
    title: input.data.title,
  });
  if (!renamed) {
    return { status: "error", message: "This conversation is unavailable." };
  }
  revalidatePath("/workspace");
  revalidatePath("/workspace/chats");
  revalidatePath(`/workspace/workers/${input.data.workerId}`);
  return { status: "success", message: "Conversation renamed." };
}

export async function deleteConversationAction(
  _previousState: DeleteConversationState,
  formData: FormData,
): Promise<DeleteConversationState> {
  const input = z
    .object({ workerId: z.uuid(), conversationId: z.uuid() })
    .safeParse({
      workerId: formData.get("workerId"),
      conversationId: formData.get("conversationId"),
    });
  if (!input.success) {
    return { status: "error", message: "This conversation is unavailable." };
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
    await deleteConversationMemory({
      organizationId,
      workerId: input.data.workerId,
      conversationId: input.data.conversationId,
    });
    const deleted = await deleteConversation(
      organizationId,
      input.data.workerId,
      input.data.conversationId,
      user.id,
    );
    if (!deleted) {
      return { status: "error", message: "This conversation is unavailable." };
    }
  } catch {
    return {
      status: "error",
      message: "Pilot could not delete this conversation. Try again.",
    };
  }

  revalidatePath("/workspace");
  revalidatePath("/workspace/chats");
  revalidatePath(`/workspace/workers/${input.data.workerId}`);
  return { status: "success", message: "Conversation deleted." };
}
