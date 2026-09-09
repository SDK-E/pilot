"use server";

import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteProjectMemory } from "@/ai/pilot-ai-client";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import {
  addProjectConversation,
  createProject,
  deleteProject,
  getProject,
  getProjectMemoryCleanupTargetForConversation,
  listProjectConversations,
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

const conversationProjectSchema = z.object({
  conversationId: z.uuid(),
  projectId: z.uuid().nullable(),
});

export type ConversationProjectState = {
  message?: string;
  status: "error" | "success";
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
    const activeOwner = await owner();
    const project = await getProject({
      ...activeOwner,
      projectId: projectId.data,
    });
    if (!project) {
      return { status: "error", message: "This project is unavailable." };
    }
    if (project.sharedMemoryEnabled) {
      const conversations = await listProjectConversations({
        ...activeOwner,
        projectId: project.id,
      });
      for (const conversation of conversations) {
        await deleteProjectMemory({
          organizationId: activeOwner.organizationId,
          workerId: conversation.workerId,
          projectId: project.id,
        });
      }
    }
    const deleted = await deleteProject({
      ...activeOwner,
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

async function moveConversationToProject(input: {
  conversationId: string;
  projectId: string;
}) {
  const activeOwner = await owner();
  const destination = await getProject({
    ...activeOwner,
    projectId: input.projectId,
  });
  if (!destination) throw new Error("This project is unavailable.");
  const currentProject = await getProjectMemoryCleanupTargetForConversation({
    ...activeOwner,
    conversationId: input.conversationId,
  });

  // Observational Memory is resource-scoped, so moving a chat must clear the
  // prior project's resource before its database association changes.
  if (
    currentProject?.sharedMemoryEnabled &&
    currentProject.id !== input.projectId
  ) {
    await deleteProjectMemory({
      organizationId: activeOwner.organizationId,
      workerId: currentProject.workerId,
      projectId: currentProject.id,
    });
  }
  const project = await addProjectConversation({
    ...activeOwner,
    projectId: input.projectId,
    conversationId: input.conversationId,
  });
  if (!project) throw new Error("This conversation is unavailable.");
  if (currentProject && currentProject.id !== project.id) {
    revalidatePath(`/workspace/projects/${currentProject.id}`);
  }
  revalidatePath(`/workspace/projects/${project.id}`);
  revalidatePath("/workspace/chats");
}

async function removeConversationFromProject(input: {
  conversationId: string;
  projectId: string;
}) {
  const activeOwner = await owner();
  const currentProject = await getProjectMemoryCleanupTargetForConversation({
    ...activeOwner,
    conversationId: input.conversationId,
  });
  if (currentProject?.id !== input.projectId) {
    throw new Error("This project conversation is unavailable.");
  }
  if (currentProject.sharedMemoryEnabled) {
    await deleteProjectMemory({
      organizationId: activeOwner.organizationId,
      workerId: currentProject.workerId,
      projectId: currentProject.id,
    });
  }
  const removed = await removeProjectConversation({
    ...activeOwner,
    projectId: input.projectId,
    conversationId: input.conversationId,
  });
  if (!removed) throw new Error("This project conversation is unavailable.");
  revalidatePath(`/workspace/projects/${input.projectId}`);
  revalidatePath("/workspace/chats");
}

export async function setConversationProjectAction(
  rawInput: z.input<typeof conversationProjectSchema>,
): Promise<ConversationProjectState> {
  const input = conversationProjectSchema.safeParse(rawInput);
  if (!input.success) {
    return { status: "error", message: "This conversation is unavailable." };
  }

  try {
    if (input.data.projectId) {
      await moveConversationToProject({
        conversationId: input.data.conversationId,
        projectId: input.data.projectId,
      });
    } else {
      const activeOwner = await owner();
      const currentProject = await getProjectMemoryCleanupTargetForConversation(
        {
          ...activeOwner,
          conversationId: input.data.conversationId,
        },
      );
      if (!currentProject) return { status: "success" };
      await removeConversationFromProject({
        conversationId: input.data.conversationId,
        projectId: currentProject.id,
      });
    }
  } catch {
    return {
      status: "error",
      message: "Pilot could not update this conversation's project.",
    };
  }
  return { status: "success" };
}

export async function addProjectConversationAction(formData: FormData) {
  await moveConversationToProject({
    conversationId: z.uuid().parse(formData.get("conversationId")),
    projectId: z.uuid().parse(formData.get("projectId")),
  });
}

export async function removeProjectConversationAction(formData: FormData) {
  await removeConversationFromProject({
    conversationId: z.uuid().parse(formData.get("conversationId")),
    projectId: z.uuid().parse(formData.get("projectId")),
  });
}
