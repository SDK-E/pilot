import "server-only";

import { truncateConversationMemory } from "@/ai/pilot-ai-client";
import {
  detachConversationAttachments,
  listMessageAttachmentPathnamesFrom,
} from "@/conversations/attachment-repository";
import { deleteMessagesFrom } from "@/conversations/conversation-message-repository";
import { deleteBlobQuietly } from "@/files/delete-blob-quietly";
import { getProjectMemoryContextForConversation } from "@/projects/project-repository";

/**
 * The shared half of edit and regenerate: forgets everything at or after
 * `cutoff` from both Pilot's own history and the runtime's memory of the
 * conversation, so the turn about to be resent does not collide with, or
 * get contaminated by, what it is replacing. Postgres is truncated after the
 * runtime call succeeds — if the runtime call fails, nothing is destroyed
 * and the caller's error simply reaches the user as a normal failed request.
 *
 * `keepAttachmentIds` are detached from the messages about to be deleted
 * first, so an edit that keeps an attachment survives the delete-and-resend
 * this powers — the caller re-parents them onto the new message afterward
 * (see `attachConversationAttachmentsToMessage`). Everything else still
 * parented to a truncated message is genuinely removed: its blob is deleted
 * (best effort — an orphaned blob is harmless, a dangling row is not) before
 * `conversation_attachments`' `messageId` foreign key cascade-deletes its row
 * along with the message.
 */
export async function forgetMessagesFrom(
  input: { organizationId: string; userId: string; agentId: string },
  conversationId: string,
  cutoff: Date,
  keepAttachmentIds: readonly string[] = [],
): Promise<void> {
  await detachConversationAttachments({
    organizationId: input.organizationId,
    userId: input.userId,
    conversationId,
    attachmentIds: keepAttachmentIds,
  });
  const removedAttachments = await listMessageAttachmentPathnamesFrom({
    organizationId: input.organizationId,
    conversationId,
    cutoff,
  });
  const project = await getProjectMemoryContextForConversation({
    organizationId: input.organizationId,
    userId: input.userId,
    conversationId,
  });
  await truncateConversationMemory({
    organizationId: input.organizationId,
    workerId: input.agentId,
    conversationId,
    project: project && {
      id: project.id,
      sharedMemoryEnabled: project.sharedMemoryEnabled,
    },
    cutoff,
  });
  await deleteMessagesFrom(
    { organizationId: input.organizationId, userId: input.userId },
    conversationId,
    cutoff,
  );
  await Promise.all(
    removedAttachments.map((attachment) =>
      deleteBlobQuietly(attachment.pathname),
    ),
  );
}
