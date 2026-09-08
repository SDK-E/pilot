"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getConversation } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { createTask } from "@/tasks/task-repository";

const inputSchema = z.object({
  workerId: z.uuid(),
  conversationId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().min(1).max(10_000),
});

export type CreateConversationTaskState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export async function createConversationTaskAction(
  _previousState: CreateConversationTaskState,
  formData: FormData,
): Promise<CreateConversationTaskState> {
  const input = inputSchema.safeParse({
    workerId: formData.get("workerId"),
    conversationId: formData.get("conversationId"),
    title: formData.get("title"),
    instructions: formData.get("instructions"),
  });
  if (!input.success) {
    return { status: "error", message: "Add a task title and instructions." };
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
  const conversation = await getConversation(
    organizationId,
    input.data.workerId,
    input.data.conversationId,
    user.id,
  );
  if (!conversation) {
    return { status: "error", message: "This conversation is unavailable." };
  }

  const task = await createTask({
    ...input.data,
    organizationId,
    createdByWorkosUserId: user.id,
  });
  if (!task) {
    return { status: "error", message: "This conversation is unavailable." };
  }
  revalidatePath(
    `/workspace/workers/${input.data.workerId}/conversations/${input.data.conversationId}`,
  );
  return { status: "success", message: "Task added to this chat." };
}
