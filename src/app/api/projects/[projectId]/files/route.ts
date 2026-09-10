import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import {
  isAcceptedPrivateFile,
  safePrivateFilename,
} from "@/files/private-file-policy";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getProject } from "@/projects/project-repository";
import { createProjectFile } from "@/projects/project-file-repository";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ projectId: string }> };

function response(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    return response("Choose an organization first.", 403);
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    return response("Your organization access is no longer active.", 403);
  const projectId = z.uuid().safeParse((await params).projectId);
  if (!projectId.success) return response("Project not found.", 404);
  const project = await getProject({
    organizationId,
    userId: user.id,
    projectId: projectId.data,
  });
  if (!project) return response("Project not found.", 404);
  const formData = await request.formData().catch(() => undefined);
  const file = formData?.get("file");
  if (!(file instanceof File)) return response("Choose a file to upload.", 400);
  if (!isAcceptedPrivateFile(file))
    return response("This file type or size is not supported.", 400);

  const pathname = `organizations/${organizationId}/projects/${project.id}/${randomUUID()}-${safePrivateFilename(file.name)}`;
  const blob = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });
  try {
    const saved = await createProjectFile({
      organizationId,
      userId: user.id,
      projectId: project.id,
      pathname: blob.pathname,
      filename: file.name.slice(0, 255),
      contentType: file.type,
      byteSize: file.size,
    });
    if (!saved) throw new Error("Project file metadata could not be saved.");
    return Response.json({ id: saved.id }, { status: 201 });
  } catch {
    await del(blob.url).catch(() => undefined);
    return response("Pilot could not save this project file.", 500);
  }
}
