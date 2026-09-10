import { del, get } from "@vercel/blob";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import {
  deleteConversationAttachment,
  getConversationAttachment,
} from "@/conversations/attachment-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ attachmentId: string }> };

async function authorizedAttachment(params: RouteContext["params"]) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  const attachmentId = z.uuid().safeParse((await params).attachmentId);
  if (!organizationId || !attachmentId.success) return undefined;
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    return undefined;
  const attachment = await getConversationAttachment({
    organizationId,
    attachmentId: attachmentId.data,
    userId: user.id,
  });
  return attachment ? { attachment, organizationId, user } : undefined;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authorized = await authorizedAttachment(params);
  if (!authorized) return new Response("Not found", { status: 404 });
  const blob = await get(authorized.attachment.pathname, { access: "private" });
  if (!blob) return new Response("Not found", { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "content-type": authorized.attachment.contentType,
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(authorized.attachment.filename)}`,
      "cache-control": "private, no-store",
    },
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authorized = await authorizedAttachment(params);
  if (!authorized) return new Response("Not found", { status: 404 });
  try {
    await del(authorized.attachment.pathname);
    await deleteConversationAttachment({
      organizationId: authorized.organizationId,
      attachmentId: authorized.attachment.id,
      userId: authorized.user.id,
    });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json(
      { error: "Pilot could not delete this file." },
      { status: 500 },
    );
  }
}
