import "server-only";

import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";

interface Owner {
  organizationId: string;
  userId: string;
}

/**
 * Looks up a single message for an edit, regenerate, or continue request,
 * scoped to the owner's conversation so one member can never mutate another
 * member's history.
 */
export async function getConversationMessage(
  owner: Owner,
  conversationId: string,
  messageId: string,
) {
  const [conversation] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.organizationId, owner.organizationId),
        eq(conversations.createdByWorkosUserId, owner.userId),
      ),
    )
    .limit(1);
  if (!conversation) return;

  const [message] = await db
    .select({
      id: conversationMessages.id,
      role: conversationMessages.role,
      content: conversationMessages.content,
      isPartial: conversationMessages.isPartial,
      createdAt: conversationMessages.createdAt,
    })
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.id, messageId),
      ),
    )
    .limit(1);
  return message;
}

/*
 * True when no other message in the conversation comes after this one.
 * Compares with `gte`, not `gt`, and excludes the message by id rather than
 * relying on the timestamp alone: Postgres stores `createdAt` at microsecond
 * precision but the driver round-trips it through a JS `Date` at millisecond
 * precision, so a message's own timestamp compared strictly-greater against
 * itself can appear to be "after itself" once truncated.
 */
export async function isLastMessage(
  conversationId: string,
  messageId: string,
  after: Date,
) {
  const [later] = await db
    .select({ id: conversationMessages.id })
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.conversationId, conversationId),
        gte(conversationMessages.createdAt, after),
        ne(conversationMessages.id, messageId),
      ),
    )
    .limit(1);
  return !later;
}

/**
 * The user message a regenerated or continued reply resends — the one
 * immediately before it, which stays untouched by either operation.
 */
export async function getPrecedingUserMessage(
  conversationId: string,
  before: Date,
) {
  const [message] = await db
    .select({
      id: conversationMessages.id,
      content: conversationMessages.content,
    })
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.role, "user"),
        lt(conversationMessages.createdAt, before),
      ),
    )
    .orderBy(desc(conversationMessages.createdAt))
    .limit(1);
  return message;
}

/**
 * Discards a message and everything sent after it — the Postgres half of an
 * edit or regenerate. Cascades to that message's activity events and
 * sources; leaves any now-orphaned `executions` rows in place as harmless
 * history, the same append-only treatment activity records already get.
 */
export async function deleteMessagesFrom(
  owner: Owner,
  conversationId: string,
  cutoff: Date,
) {
  await db
    .delete(conversationMessages)
    .where(
      and(
        eq(conversationMessages.organizationId, owner.organizationId),
        eq(conversationMessages.conversationId, conversationId),
        gte(conversationMessages.createdAt, cutoff),
      ),
    );
}

/**
 * Appends continuation text onto an existing message instead of creating a
 * new one — the Postgres half of "continue" resuming a stopped reply.
 * Concatenates server-side so a concurrent read never races the update.
 */
export async function appendConversationMessageContent(
  owner: Owner,
  messageId: string,
  additionalText: string,
  isPartial: boolean,
) {
  const [message] = await db
    .update(conversationMessages)
    .set({
      content: sql`${conversationMessages.content} || ${additionalText}`,
      isPartial,
    })
    .where(
      and(
        eq(conversationMessages.organizationId, owner.organizationId),
        eq(conversationMessages.id, messageId),
      ),
    )
    .returning({
      id: conversationMessages.id,
      role: conversationMessages.role,
      content: conversationMessages.content,
      isError: conversationMessages.isError,
      createdAt: conversationMessages.createdAt,
    });
  return message;
}
