"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getConversation } from "@/conversations/conversation-repository";
import { createMemory, deleteMemory } from "@/memory/memory-repository";
import { updateOrganizationStandingInstructions } from "@/organizations/organization-preference-repository";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { getProject } from "@/projects/project-repository";
import { updateGeneralInstructions } from "@/users/user-preference-repository";

const ADMIN_ROLES = new Set(["owner", "admin"]);

export async function updateGeneralInstructionsAction(formData: FormData) {
  const input = z
    .object({ generalInstructions: z.string().trim().max(4000) })
    .safeParse({ generalInstructions: formData.get("generalInstructions") });
  if (!input.success) return;
  const session = await requireWorkspaceSession();
  await updateGeneralInstructions({
    workosUserId: session.user.id,
    generalInstructions: input.data.generalInstructions || null,
  });
  revalidatePath("/", "layout");
}

export async function updateOrganizationStandingInstructionsAction(
  formData: FormData,
) {
  const input = z
    .object({ standingInstructions: z.string().trim().max(4000) })
    .safeParse({ standingInstructions: formData.get("standingInstructions") });
  if (!input.success) return;
  const session = await requireWorkspaceSession();
  if (!ADMIN_ROLES.has(session.membership.role.slug)) {
    throw new Error(
      "Only organization owners and admins can change standing instructions.",
    );
  }
  await updateOrganizationStandingInstructions({
    organizationId: session.organizationId,
    standingInstructions: input.data.standingInstructions || null,
  });
  revalidatePath("/", "layout");
}

const memoryScopeSchema = z.enum([
  "organization",
  "user",
  "project",
  "conversation",
]);

type CreateMemoryInput = z.infer<ReturnType<typeof createMemoryFormSchema>>;

function createMemoryFormSchema() {
  return z.object({
    scope: memoryScopeSchema,
    content: z.string().trim().min(1).max(1000),
    projectId: z.uuid().optional(),
    conversationId: z.uuid().optional(),
  });
}

/**
 * Verifies the caller may create a note at the given scope: an admin role
 * for "organization", ownership of the named project/conversation for
 * "project"/"conversation". Throws if not.
 */
async function assertCanCreateMemory(
  data: CreateMemoryInput,
  session: Awaited<ReturnType<typeof requireWorkspaceSession>>,
) {
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };
  switch (data.scope) {
    case "organization": {
      if (!ADMIN_ROLES.has(session.membership.role.slug)) {
        throw new Error(
          "Only organization owners and admins can add organization memory.",
        );
      }
      break;
    }
    case "project": {
      const project =
        data.projectId &&
        (await getProject({ ...owner, projectId: data.projectId }));
      if (!project) throw new Error("This project is unavailable.");
      break;
    }
    case "conversation": {
      const conversation =
        data.conversationId &&
        (await getConversation(owner, data.conversationId));
      if (!conversation) throw new Error("This conversation is unavailable.");
      break;
    }
    case "user": {
      break;
    }
  }
}

/**
 * "organization" and "user" notes are created from Settings; "project" and
 * "conversation" notes are created inline where those live (a project's own
 * page, a conversation's own menu) — either way this one action handles all
 * four, since only the ownership check differs.
 */
export async function createMemoryAction(formData: FormData) {
  const projectId = formData.get("projectId");
  const conversationId = formData.get("conversationId");
  const input = createMemoryFormSchema().safeParse({
    scope: formData.get("scope"),
    content: formData.get("content"),
    projectId: projectId ?? undefined,
    conversationId: conversationId ?? undefined,
  });
  if (!input.success) throw new Error("Enter what you'd like remembered.");
  const session = await requireWorkspaceSession();
  await assertCanCreateMemory(input.data, session);
  await createMemory({
    organizationId: session.organizationId,
    createdByWorkosUserId: session.user.id,
    scope: input.data.scope,
    content: input.data.content,
    projectId: input.data.projectId,
    conversationId: input.data.conversationId,
  });
  revalidatePath("/", "layout");
}

export async function deleteMemoryAction(formData: FormData) {
  const memoryId = z.uuid().safeParse(formData.get("memoryId"));
  if (!memoryId.success) return;
  const session = await requireWorkspaceSession();
  await deleteMemory({
    organizationId: session.organizationId,
    workosUserId: session.user.id,
    memoryId: memoryId.data,
  });
  revalidatePath("/", "layout");
}
