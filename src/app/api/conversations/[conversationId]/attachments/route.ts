import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { createConversationAttachment } from "@/conversations/attachment-repository";
import { getConversation } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

export const runtime = "nodejs";

const maxBytes = 10 * 1024 * 1024;
const acceptedTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type RouteContext = { params: Promise<{ conversationId: string }> };

function response(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "upload";
}

export async function POST(request: Request, { params }: RouteContext) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    return response("Choose an organization first.", 403);
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    return response("Your organization access is no longer active.", 403);
  const conversationId = z.uuid().safeParse((await params).conversationId);
  if (!conversationId.success) return response("Conversation not found.", 404);
  const formData = await request.formData().catch(() => undefined);
  const workerId = z.uuid().safeParse(formData?.get("workerId"));
  const file = formData?.get("file");
  if (!workerId.success || !(file instanceof File))
    return response("Choose a file to attach.", 400);
  if (!acceptedTypes.has(file.type) || file.size < 1 || file.size > maxBytes)
    return response("This file type or size is not supported.", 400);
  const conversation = await getConversation(
    organizationId,
    workerId.data,
    conversationId.data,
    user.id,
  );
  if (!conversation) return response("Conversation not found.", 404);

  const pathname = `organizations/${organizationId}/conversations/${conversation.id}/${randomUUID()}-${safeFilename(file.name)}`;
  const blob = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });
  try {
    const attachment = await createConversationAttachment({
      organizationId,
      workerId: workerId.data,
      conversationId: conversation.id,
      userId: user.id,
      pathname: blob.pathname,
      filename: file.name.slice(0, 255),
      contentType: file.type,
      byteSize: file.size,
    });
    if (!attachment) throw new Error("Attachment metadata could not be saved.");
    return Response.json({ id: attachment.id }, { status: 201 });
  } catch {
    await del(blob.url).catch(() => undefined);
    return response("Pilot could not attach this file.", 500);
  }
}
