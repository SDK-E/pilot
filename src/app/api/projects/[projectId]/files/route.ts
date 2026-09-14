import { randomUUID } from "node:crypto";

import { put } from "@vercel/blob";
import { z } from "zod";

import { deleteBlobQuietly } from "@/files/delete-blob-quietly";
import {
  isAcceptedPrivateFile,
  safePrivateFilename,
} from "@/files/private-file-policy";
import { errorResponse as error, readFormData } from "@/lib/http";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";
import { createProjectFile } from "@/projects/project-file-repository";
import { getProject } from "@/projects/project-repository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };

  const { projectId: rawProjectId } = await params;
  const projectId = z.uuid().safeParse(rawProjectId);
  if (!projectId.success) return error("Project not found.", 404);
  const project = await getProject({ ...owner, projectId: projectId.data });
  if (!project) return error("Project not found.", 404);
  const formData = await readFormData(request);
  const file = formData?.get("file");
  if (!(file instanceof File)) return error("Choose a file to upload.", 400);
  if (!isAcceptedPrivateFile(file)) {
    return error("This file type or size is not supported.", 400);
  }

  const pathname = `organizations/${owner.organizationId}/projects/${project.id}/${randomUUID()}-${safePrivateFilename(file.name)}`;
  const blob = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });
  try {
    const saved = await createProjectFile({
      ...owner,
      projectId: project.id,
      pathname: blob.pathname,
      filename: file.name.slice(0, 255),
      contentType: file.type,
      byteSize: file.size,
    });
    if (!saved) throw new Error("Project file metadata could not be saved.");
    return Response.json({ id: saved.id }, { status: 201 });
  } catch {
    await deleteBlobQuietly(blob.url);
    return error("Pilot could not save this project file.", 500);
  }
}
