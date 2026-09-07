"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { createTask } from "@/tasks/task-repository";

const inputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().min(1).max(10_000),
});

export async function createTaskAction(formData: FormData) {
  const input = inputSchema.safeParse({
    title: formData.get("title"),
    instructions: formData.get("instructions"),
  });
  if (!input.success) return;
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) return;
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) return;
  await createTask({
    ...input.data,
    organizationId,
    createdByWorkosUserId: user.id,
  });
  revalidatePath("/workspace/tasks");
}
