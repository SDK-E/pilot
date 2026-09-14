"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { updateUserManagedTaskStatus } from "@/tasks/task-repository";

const taskStatusSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(["completed", "cancelled"]),
});

export async function updateTaskStatusAction(formData: FormData) {
  const input = taskStatusSchema.safeParse({
    taskId: formData.get("taskId"),
    status: formData.get("status"),
  });
  if (!input.success) return;
  const { organizationId, user } = await requireWorkspaceSession();
  await updateUserManagedTaskStatus({
    organizationId,
    userId: user.id,
    ...input.data,
  });
  revalidatePath("/work");
}
