import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationAttachments, conversations } from "@/db/schema";

export async function listConversationAttachments(input: {
  organizationId: string;
  conversationId: string;
  userId: string;
}) {
  return db
    .select({
      id: conversationAttachments.id,
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
