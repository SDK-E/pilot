import { randomUUID } from "node:crypto";

import { put } from "@vercel/blob";
import { z } from "zod";

import { createConversationAttachment } from "@/conversations/attachment-repository";
import { getConversation } from "@/conversations/conversation-repository";
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

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };

  const { conversationId: rawConversationId } = await params;
  const conversationId = z.uuid().safeParse(rawConversationId);
  if (!conversationId.success) return error("Conversation not found.", 404);
  const formData = await readFormData(request);
  const file = formData?.get("file");
  if (!(file instanceof File)) return error("Choose a file to attach.", 400);
  if (!isAcceptedPrivateFile(file)) {
    return error("This file type or size is not supported.", 400);
  }
  const conversation = await getConversation(owner, conversationId.data);
  if (!conversation) return error("Conversation not found.", 404);

  const pathname = `organizations/${owner.organizationId}/conversations/${conversation.id}/${randomUUID()}-${safePrivateFilename(file.name)}`;
  const blob = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });
  try {
    const attachment = await createConversationAttachment({
      ...owner,
      workerId: conversation.agentId,
      conversationId: conversation.id,
      pathname: blob.pathname,
      filename: file.name.slice(0, 255),
      contentType: file.type,
      byteSize: file.size,
    });
    if (!attachment) throw new Error("Attachment metadata could not be saved.");
    return Response.json({ id: attachment.id }, { status: 201 });
  } catch (error_) {
    // eslint-disable-next-line no-console -- only path to surface this server-side
    console.error("Conversation attachment upload failed:", error_);
    await deleteBlobQuietly(blob.url);
    return error("Pilot could not attach this file.", 500);
  }
}
