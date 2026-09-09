import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  conversations,
  projectConversations,
  projects,
  workers,
} from "@/db/schema";

type ProjectOwner = { organizationId: string; userId: string };

export async function createProject(
  input: ProjectOwner & {
    name: string;
    instructions?: string;
    sharedMemoryEnabled?: boolean;
  },
) {
  const [project] = await db
    .insert(projects)
    .values({
      organizationId: input.organizationId,
      createdByWorkosUserId: input.userId,
      name: input.name,
      instructions: input.instructions,
      sharedMemoryEnabled: input.sharedMemoryEnabled ?? false,
    })
    .returning({ id: projects.id });
  return project;
}

export function listProjects(input: ProjectOwner) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      instructions: projects.instructions,
      sharedMemoryEnabled: projects.sharedMemoryEnabled,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(desc(projects.updatedAt));
}

export async function getProject(input: ProjectOwner & { projectId: string }) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      instructions: projects.instructions,
      sharedMemoryEnabled: projects.sharedMemoryEnabled,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(
      and(
        eq(projects.id, input.projectId),
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
      ),
    )
    .limit(1);
  return project;
}

export async function updateProject(
  input: ProjectOwner & {
    projectId: string;
    name: string;
    instructions?: string;
    sharedMemoryEnabled: boolean;
  },
) {
  const [project] = await db
    .update(projects)
    .set({
      name: input.name,
      instructions: input.instructions,
      sharedMemoryEnabled: input.sharedMemoryEnabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.id, input.projectId),
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
      ),
    )
    .returning({ id: projects.id });
  return project;
}

export async function deleteProject(
  input: ProjectOwner & { projectId: string },
) {
  const [deleted] = await db
    .delete(projects)
    .where(
      and(
        eq(projects.id, input.projectId),
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
      ),
    )
    .returning({ id: projects.id });
  return deleted;
}

export async function addProjectConversation(
  input: ProjectOwner & { projectId: string; conversationId: string },
) {
  const project = await getProject(input);
  if (!project) return undefined;
  const [conversation] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, input.conversationId),
        eq(conversations.organizationId, input.organizationId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .limit(1);
  if (!conversation) return undefined;
  await db
    .insert(projectConversations)
    .values({
      projectId: input.projectId,
      conversationId: input.conversationId,
    })
    .onConflictDoUpdate({
      target: projectConversations.conversationId,
      set: { projectId: input.projectId, createdAt: new Date() },
    });
  return project;
}

export async function removeProjectConversation(
  input: ProjectOwner & { projectId: string; conversationId: string },
) {
  const project = await getProject(input);
  if (!project) return undefined;

  const [removed] = await db
    .delete(projectConversations)
    .where(
      and(
        eq(projectConversations.projectId, input.projectId),
        eq(projectConversations.conversationId, input.conversationId),
      ),
    )
    .returning({ conversationId: projectConversations.conversationId });
  return removed;
}

export function listProjectConversations(
  input: ProjectOwner & { projectId: string },
) {
  return db
    .select({
      id: conversations.id,
      workerId: conversations.workerId,
      title: conversations.title,
      agentName: workers.name,
      updatedAt: conversations.updatedAt,
    })
    .from(projectConversations)
    .innerJoin(projects, eq(projectConversations.projectId, projects.id))
    .innerJoin(
      conversations,
      eq(projectConversations.conversationId, conversations.id),
    )
    .innerJoin(workers, eq(conversations.workerId, workers.id))
    .where(
      and(
        eq(projects.id, input.projectId),
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(desc(conversations.updatedAt));
}

export async function getProjectMemoryContextForConversation(
  input: ProjectOwner & { conversationId: string },
) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      instructions: projects.instructions,
      sharedMemoryEnabled: projects.sharedMemoryEnabled,
    })
    .from(projectConversations)
    .innerJoin(projects, eq(projectConversations.projectId, projects.id))
    .innerJoin(
      conversations,
      eq(projectConversations.conversationId, conversations.id),
    )
    .where(
      and(
        eq(projectConversations.conversationId, input.conversationId),
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
        eq(conversations.organizationId, input.organizationId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .limit(1);
  return project;
}
