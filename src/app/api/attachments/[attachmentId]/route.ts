import { z } from "zod";

import {
  deleteConversationAttachment,
  getConversationAttachment,
} from "@/conversations/attachment-repository";
import {
  deletePrivateFile,
  privateFileResponse,
} from "@/files/private-file-response";
import {
  getWorkspaceSession,
  isWorkspaceSession,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ attachmentId: string }>;
}

/**
 * The attachment only if the caller is a member and created its chat.
 */
async function authorizedAttachment(params: RouteContext["params"]) {
  const session = await getWorkspaceSession();
  const { attachmentId: rawAttachmentId } = await params;
  const attachmentId = z.uuid().safeParse(rawAttachmentId);
  if (!isWorkspaceSession(session) || !attachmentId.success) return;
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };
  const attachment = await getConversationAttachment({
    ...owner,
    attachmentId: attachmentId.data,
  });
  return attachment ? { attachment, owner } : undefined;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authorized = await authorizedAttachment(params);
  if (!authorized) return new Response("Not found", { status: 404 });
  return privateFileResponse(authorized.attachment);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authorized = await authorizedAttachment(params);
  if (!authorized) return new Response("Not found", { status: 404 });
  return deletePrivateFile(
    authorized.attachment,
    () =>
      deleteConversationAttachment({
        ...authorized.owner,
        attachmentId: authorized.attachment.id,
      }),
    "Pilot could not delete this file.",
  );
}
