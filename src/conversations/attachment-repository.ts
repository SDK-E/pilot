import "server-only";

import { and, asc, eq, gte, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db/client";
import {
  conversationAttachments,
  conversationMessages,
  conversations,
} from "@/db/schema";

export async function listConversationAttachments(input: {
  organizationId: string;
  conversationId: string;
  userId: string;
}) {
  return db
    .select({
      id: conversationAttachments.id,
      messageId: conversationAttachments.messageId,
      filename: conversationAttachments.filename,
      contentType: conversationAttachments.contentType,
      byteSize: conversationAttachments.byteSize,
      createdAt: conversationAttachments.createdAt,
    })
    .from(conversationAttachments)
    .innerJoin(
      conversations,
      eq(conversationAttachments.conversationId, conversations.id),
    )
    .where(
      and(
        eq(conversationAttachments.organizationId, input.organizationId),
        eq(conversationAttachments.conversationId, input.conversationId),
        eq(conversationAttachments.createdByWorkosUserId, input.userId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(asc(conversationAttachments.createdAt));
}

export async function listTextExtractableConversationAttachments(input: {
  organizationId: string;
  conversationId: string;
  userId: string;
}) {
  return db
    .select({
      pathname: conversationAttachments.pathname,
      filename: conversationAttachments.filename,
      contentType: conversationAttachments.contentType,
      byteSize: conversationAttachments.byteSize,
    })
    .from(conversationAttachments)
    .innerJoin(
      conversations,
      eq(conversationAttachments.conversationId, conversations.id),
    )
    .where(
      and(
        eq(conversationAttachments.organizationId, input.organizationId),
        eq(conversationAttachments.conversationId, input.conversationId),
        eq(conversationAttachments.createdByWorkosUserId, input.userId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(asc(conversationAttachments.createdAt));
}

export async function createConversationAttachment(input: {
  organizationId: string;
  workerId: string;
  conversationId: string;
  userId: string;
  pathname: string;
  filename: string;
  contentType: string;
  byteSize: number;
}) {
  const [attachment] = await db
    .insert(conversationAttachments)
    .values({
      organizationId: input.organizationId,
      workerId: input.workerId,
      conversationId: input.conversationId,
      createdByWorkosUserId: input.userId,
      pathname: input.pathname,
      filename: input.filename,
      contentType: input.contentType,
      byteSize: input.byteSize,
    })
    .returning({ id: conversationAttachments.id });
  return attachment;
}

export async function getConversationAttachment(input: {
  organizationId: string;
  attachmentId: string;
  userId: string;
}) {
  const [attachment] = await db
    .select({
      id: conversationAttachments.id,
      pathname: conversationAttachments.pathname,
      filename: conversationAttachments.filename,
      contentType: conversationAttachments.contentType,
    })
    .from(conversationAttachments)
    .innerJoin(
      conversations,
      eq(conversationAttachments.conversationId, conversations.id),
    )
    .where(
      and(
        eq(conversationAttachments.organizationId, input.organizationId),
        eq(conversationAttachments.id, input.attachmentId),
        eq(conversationAttachments.createdByWorkosUserId, input.userId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .limit(1);
  return attachment;
}

export async function deleteConversationAttachment(input: {
  organizationId: string;
  attachmentId: string;
  userId: string;
}) {
  const [attachment] = await db
    .delete(conversationAttachments)
    .where(
      and(
        eq(conversationAttachments.organizationId, input.organizationId),
        eq(conversationAttachments.id, input.attachmentId),
        eq(conversationAttachments.createdByWorkosUserId, input.userId),
      ),
    )
    .returning({ pathname: conversationAttachments.pathname });
  return attachment;
}

/**
 * The blob pathnames of attachments still parented to a message at or after
 * `cutoff`, about to be truncated. A caller detaches (see
 * `detachConversationAttachments`) anything it wants to keep before calling
 * this, so only genuinely-removed attachments' blobs get cleaned up here.
 */
export function listMessageAttachmentPathnamesFrom(input: {
  organizationId: string;
  conversationId: string;
  cutoff: Date;
}) {
  return db
    .select({ pathname: conversationAttachments.pathname })
    .from(conversationAttachments)
    .innerJoin(
      conversationMessages,
      eq(conversationAttachments.messageId, conversationMessages.id),
    )
    .where(
      and(
        eq(conversationAttachments.organizationId, input.organizationId),
        eq(conversationAttachments.conversationId, input.conversationId),
        isNotNull(conversationAttachments.messageId),
        gte(conversationMessages.createdAt, input.cutoff),
      ),
    );
}

/**
 * Detaches attachments from whatever message they currently belong to
 * (`messageId` -> null), so an edit that keeps them survives the old
 * message being deleted out from under them.
 */
export async function detachConversationAttachments(input: {
  organizationId: string;
  userId: string;
  conversationId: string;
  attachmentIds: readonly string[];
}) {
  if (input.attachmentIds.length === 0) return;
  await db
    .update(conversationAttachments)
    .set({ messageId: null })
    .where(
      and(
        eq(conversationAttachments.organizationId, input.organizationId),
        eq(conversationAttachments.conversationId, input.conversationId),
        eq(conversationAttachments.createdByWorkosUserId, input.userId),
        inArray(conversationAttachments.id, [...input.attachmentIds]),
      ),
    );
}

/**
 * Parents attachments the caller owns onto the message just created — for
 * newly-uploaded files, and for ones detached above during an edit.
 */
export async function attachConversationAttachmentsToMessage(input: {
  organizationId: string;
  userId: string;
  conversationId: string;
  messageId: string;
  attachmentIds: readonly string[];
}) {
  if (input.attachmentIds.length === 0) return;
  await db
    .update(conversationAttachments)
    .set({ messageId: input.messageId })
    .where(
      and(
        eq(conversationAttachments.organizationId, input.organizationId),
        eq(conversationAttachments.conversationId, input.conversationId),
        eq(conversationAttachments.createdByWorkosUserId, input.userId),
        inArray(conversationAttachments.id, [...input.attachmentIds]),
      ),
    );
}
