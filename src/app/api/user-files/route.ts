import { randomUUID } from "node:crypto";

import { put } from "@vercel/blob";

import { deleteBlobQuietly } from "@/files/delete-blob-quietly";
import {
  isAcceptedPrivateFile,
  safePrivateFilename,
} from "@/files/private-file-policy";
import { createUserFile } from "@/files/user-file-repository";
import { errorResponse as error, readFormData } from "@/lib/http";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };

  const formData = await readFormData(request);
  const file = formData?.get("file");
  if (!(file instanceof File)) return error("Choose a file to upload.", 400);
  if (!isAcceptedPrivateFile(file)) {
    return error("This file type or size is not supported.", 400);
  }

  const pathname = `organizations/${owner.organizationId}/users/${owner.userId}/${randomUUID()}-${safePrivateFilename(file.name)}`;
  const blob = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });
  try {
    const saved = await createUserFile({
      ...owner,
      pathname: blob.pathname,
      filename: file.name.slice(0, 255),
      contentType: file.type,
      byteSize: file.size,
    });
    if (!saved) throw new Error("User file metadata could not be saved.");
    return Response.json({ id: saved.id }, { status: 201 });
  } catch (error_) {
    // eslint-disable-next-line no-console -- only path to surface this server-side
    console.error("User file upload failed:", error_);
    await deleteBlobQuietly(blob.url);
    return error("Pilot could not save this file.", 500);
  }
}
