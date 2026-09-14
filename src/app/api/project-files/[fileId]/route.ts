import { z } from "zod";

import {
  deletePrivateFile,
  privateFileResponse,
} from "@/files/private-file-response";
import {
  getWorkspaceSession,
  isWorkspaceSession,
} from "@/organizations/workspace-session";
import {
  deleteProjectFile,
  getProjectFile,
} from "@/projects/project-file-repository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

/**
 * The project file only if the caller is a member and owns its project.
 */
async function authorizedFile(params: RouteContext["params"]) {
  const session = await getWorkspaceSession();
  const { fileId: rawFileId } = await params;
  const fileId = z.uuid().safeParse(rawFileId);
  if (!isWorkspaceSession(session) || !fileId.success) return;
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };
  const file = await getProjectFile({ ...owner, fileId: fileId.data });
  return file ? { file, owner } : undefined;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authorized = await authorizedFile(params);
  if (!authorized) return new Response("Not found", { status: 404 });
  return privateFileResponse(authorized.file);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authorized = await authorizedFile(params);
  if (!authorized) return new Response("Not found", { status: 404 });
  return deletePrivateFile(
    authorized.file,
    () =>
      deleteProjectFile({ ...authorized.owner, fileId: authorized.file.id }),
    "Pilot could not delete this project file.",
  );
}
