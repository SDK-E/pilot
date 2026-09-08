"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateUserPreferences } from "@/users/user-preference-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { updateOrganizationDefaultWorker } from "@/organizations/organization-preference-repository";

const inputSchema = z.object({
  sendMessageShortcut: z.enum(["enter", "mod_enter"]),
});

export async function updateMessageShortcutAction(formData: FormData) {
  const input = inputSchema.safeParse({
    sendMessageShortcut: formData.get("sendMessageShortcut"),
  });
  if (!input.success) return;

  const { user } = await withAuth({ ensureSignedIn: true });
  await updateUserPreferences({
    workosUserId: user.id,
    sendMessageShortcut: input.data.sendMessageShortcut,
  });
  revalidatePath("/workspace", "layout");
}

export async function updateDefaultAgentAction(formData: FormData) {
  const input = z
    .object({ defaultWorkerId: z.uuid() })
    .safeParse({ defaultWorkerId: formData.get("defaultWorkerId") });
  if (!input.success) return;

  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    throw new Error("Choose an organization first.");
  }
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) {
    throw new Error("Your organization access is no longer active.");
  }

  const preferences = await updateOrganizationDefaultWorker({
    organizationId,
    defaultWorkerId: input.data.defaultWorkerId,
  });
  if (!preferences) throw new Error("This agent is unavailable.");
  revalidatePath("/workspace");
  revalidatePath("/workspace/settings");
}
