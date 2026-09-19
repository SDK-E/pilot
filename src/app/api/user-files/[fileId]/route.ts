import { z } from "zod";

import {
  deletePrivateFile,
  privateFileResponse,
} from "@/files/private-file-response";
import { deleteUserFile, getUserFile } from "@/files/user-file-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

async function authorizedFile(params: RouteContext["params"]) {
  const session = await getWorkspaceSession();
  const { fileId: rawFileId } = await params;
  const fileId = z.uuid().safeParse(rawFileId);
  if (!isWorkspaceSession(session) || !fileId.success) return;
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };
  const file = await getUserFile({ ...owner, fileId: fileId.data });
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
    () => deleteUserFile({ ...authorized.owner, fileId: authorized.file.id }),
    "Pilot could not delete this file.",
  );
}
