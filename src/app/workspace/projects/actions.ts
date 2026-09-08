"use server";

import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import {
  addProjectConversation,
  createProject,
  deleteProject,
  removeProjectConversation,
  updateProject,
} from "@/projects/project-repository";

const projectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(10_000).optional(),
  sharedMemoryEnabled: z.boolean(),
});

async function owner() {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    throw new Error("Choose an organization first.");
  }
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) {
    throw new Error("Your organization access is no longer active.");
  }
  return { organizationId, userId: user.id };
}

export type DeleteProjectState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export async function createProjectAction(formData: FormData) {
  const input = projectSchema.parse({
    name: formData.get("name"),
    instructions: formData.get("instructions") || undefined,
    sharedMemoryEnabled: false,
  });
  const project = await createProject({ ...(await owner()), ...input });
  redirect(`/workspace/projects/${project.id}`);
}

export async function updateProjectAction(formData: FormData) {
  const projectId = z.uuid().parse(formData.get("projectId"));
  const input = projectSchema.parse({
    name: formData.get("name"),
    instructions: formData.get("instructions") || undefined,
    sharedMemoryEnabled: formData.get("sharedMemoryEnabled") === "on",
  });
  const project = await updateProject({
    ...(await owner()),
    ...input,
    projectId,
  });
  if (!project) throw new Error("This project is unavailable.");
  revalidatePath(`/workspace/projects/${projectId}`);
  revalidatePath("/workspace/projects");
}

export async function deleteProjectAction(
  _previousState: DeleteProjectState,
  formData: FormData,
): Promise<DeleteProjectState> {
  const projectId = z.uuid().safeParse(formData.get("projectId"));
  if (!projectId.success) {
    return { status: "error", message: "This project is unavailable." };
  }

  try {
    const deleted = await deleteProject({
      ...(await owner()),
      projectId: projectId.data,
    });
    if (!deleted) {
      return { status: "error", message: "This project is unavailable." };
    }
  } catch {
    return { status: "error", message: "Pilot could not delete this project." };
  }

  revalidatePath("/workspace/projects");
  return { status: "success" };
}

export async function addProjectConversationAction(formData: FormData) {
  const projectId = z.uuid().parse(formData.get("projectId"));
  const conversationId = z.uuid().parse(formData.get("conversationId"));
  const project = await addProjectConversation({
    ...(await owner()),
    projectId,
    conversationId,
  });
  if (!project) throw new Error("This conversation is unavailable.");
  revalidatePath(`/workspace/projects/${projectId}`);
}

export async function removeProjectConversationAction(formData: FormData) {
  const projectId = z.uuid().parse(formData.get("projectId"));
  const conversationId = z.uuid().parse(formData.get("conversationId"));
  const removed = await removeProjectConversation({
    ...(await owner()),
    projectId,
    conversationId,
  });
  if (!removed) throw new Error("This project conversation is unavailable.");
  revalidatePath(`/workspace/projects/${projectId}`);
}
