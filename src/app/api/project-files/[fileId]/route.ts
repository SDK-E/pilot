import { del, get } from "@vercel/blob";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import {
  deleteProjectFile,
  getProjectFile,
} from "@/projects/project-file-repository";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ fileId: string }> };

async function authorizedFile(params: RouteContext["params"]) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  const fileId = z.uuid().safeParse((await params).fileId);
  if (!organizationId || !fileId.success) return undefined;
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    return undefined;
  const file = await getProjectFile({
    organizationId,
    userId: user.id,
    fileId: fileId.data,
  });
  return file ? { file, organizationId, user } : undefined;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authorized = await authorizedFile(params);
  if (!authorized) return new Response("Not found", { status: 404 });
  const blob = await get(authorized.file.pathname, { access: "private" });
  if (!blob) return new Response("Not found", { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "content-type": authorized.file.contentType,
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(authorized.file.filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authorized = await authorizedFile(params);
  if (!authorized) return new Response("Not found", { status: 404 });
  try {
    await del(authorized.file.pathname);
    await deleteProjectFile({
      organizationId: authorized.organizationId,
      userId: authorized.user.id,
      fileId: authorized.file.id,
    });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json(
      { error: "Pilot could not delete this project file." },
      { status: 500 },
    );
  }
}
