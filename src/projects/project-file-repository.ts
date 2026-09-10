import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  conversations,
  projectConversations,
  projectFiles,
  projects,
} from "@/db/schema";

type Owner = { organizationId: string; userId: string };

const fileFields = {
  id: projectFiles.id,
  pathname: projectFiles.pathname,
  filename: projectFiles.filename,
  contentType: projectFiles.contentType,
  byteSize: projectFiles.byteSize,
  createdAt: projectFiles.createdAt,
};

export function listProjectFiles(input: Owner & { projectId: string }) {
  return db
    .select(fileFields)
    .from(projectFiles)
    .innerJoin(projects, eq(projectFiles.projectId, projects.id))
    .where(
      and(
        eq(projectFiles.projectId, input.projectId),
        eq(projectFiles.organizationId, input.organizationId),
        eq(projectFiles.createdByWorkosUserId, input.userId),
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(asc(projectFiles.createdAt));
}

export async function createProjectFile(
  input: Owner & {
    projectId: string;
    pathname: string;
    filename: string;
    contentType: string;
    byteSize: number;
  },
) {
  const [file] = await db
    .insert(projectFiles)
    .values({
      organizationId: input.organizationId,
      projectId: input.projectId,
      createdByWorkosUserId: input.userId,
      pathname: input.pathname,
      filename: input.filename,
      contentType: input.contentType,
      byteSize: input.byteSize,
    })
    .returning({ id: projectFiles.id });
  return file;
}

export async function getProjectFile(input: Owner & { fileId: string }) {
  const [file] = await db
    .select(fileFields)
    .from(projectFiles)
    .innerJoin(projects, eq(projectFiles.projectId, projects.id))
    .where(
      and(
        eq(projectFiles.id, input.fileId),
        eq(projectFiles.organizationId, input.organizationId),
        eq(projectFiles.createdByWorkosUserId, input.userId),
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
      ),
    )
    .limit(1);
  return file;
}

export async function deleteProjectFile(input: Owner & { fileId: string }) {
  const [file] = await db
    .delete(projectFiles)
    .where(
      and(
        eq(projectFiles.id, input.fileId),
        eq(projectFiles.organizationId, input.organizationId),
        eq(projectFiles.createdByWorkosUserId, input.userId),
      ),
    )
    .returning({ pathname: projectFiles.pathname });
  return file;
}

export async function listProjectFilePaths(
  input: Owner & { projectId: string },
) {
  return db
    .select({ pathname: projectFiles.pathname })
    .from(projectFiles)
    .innerJoin(projects, eq(projectFiles.projectId, projects.id))
    .where(
      and(
        eq(projectFiles.projectId, input.projectId),
        eq(projectFiles.organizationId, input.organizationId),
        eq(projectFiles.createdByWorkosUserId, input.userId),
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
      ),
    );
}

export function listTextExtractableProjectFilesForConversation(
  input: Owner & { conversationId: string },
) {
  return db
    .select({
      pathname: projectFiles.pathname,
      filename: projectFiles.filename,
      contentType: projectFiles.contentType,
      byteSize: projectFiles.byteSize,
    })
    .from(projectConversations)
    .innerJoin(projects, eq(projectConversations.projectId, projects.id))
    .innerJoin(projectFiles, eq(projectFiles.projectId, projects.id))
    .innerJoin(
      conversations,
      eq(projectConversations.conversationId, conversations.id),
    )
    .where(
      and(
        eq(projectConversations.conversationId, input.conversationId),
        eq(projects.organizationId, input.organizationId),
        eq(projects.createdByWorkosUserId, input.userId),
        eq(projectFiles.organizationId, input.organizationId),
        eq(projectFiles.createdByWorkosUserId, input.userId),
        eq(conversations.organizationId, input.organizationId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(asc(projectFiles.createdAt));
}
