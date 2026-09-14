"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAgent } from "@/agents/agent-repository";
import {
  updateOrganizationDefaultWorker,
  updateOrganizationModelPolicy,
} from "@/organizations/organization-preference-repository";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { updateUserPreferences } from "@/users/user-preference-repository";

export async function updateMessageShortcutAction(formData: FormData) {
  const input = z
    .object({ sendMessageShortcut: z.enum(["enter", "mod_enter"]) })
    .safeParse({ sendMessageShortcut: formData.get("sendMessageShortcut") });
  if (!input.success) return;
  const { user } = await withAuth({ ensureSignedIn: true });
  await updateUserPreferences({ workosUserId: user.id, ...input.data });
  revalidatePath("/", "layout");
}

export async function updateDefaultAgentAction(formData: FormData) {
  const input = z
    .object({ agentId: z.uuid() })
    .safeParse({ agentId: formData.get("agentId") });
  if (!input.success) return;
  const { organizationId } = await requireWorkspaceSession();
  const agent = await getAgent(organizationId, input.data.agentId);
  if (!agent || agent.archived) throw new Error("This agent is unavailable.");
  await updateOrganizationDefaultWorker({
    organizationId,
    defaultWorkerId: agent.id,
  });
  revalidatePath("/", "layout");
}

const modelPolicySchema = z.object({
  primaryModelId: z
    .string()
    .trim()
    .regex(/^kilo\/[a-z0-9][a-z0-9._:-]*(?:\/[a-z0-9][a-z0-9._:-]*)*$/i)
    .max(200),
  retryEnabled: z.boolean(),
});

export async function updateModelPolicyAction(formData: FormData) {
  const input = modelPolicySchema.safeParse({
    primaryModelId: formData.get("primaryModelId"),
    retryEnabled: formData.get("retryEnabled") === "true",
  });
  if (!input.success) throw new Error("Enter a valid Kilo Gateway model ID.");
  const { organizationId, membership } = await requireWorkspaceSession();
  if (!["owner", "admin"].includes(membership.role.slug)) {
    throw new Error(
      "Only organization owners and admins can change the model policy.",
    );
  }
  await updateOrganizationModelPolicy({ organizationId, ...input.data });
  revalidatePath("/", "layout");
}
