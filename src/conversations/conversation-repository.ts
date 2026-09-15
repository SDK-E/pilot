import "server-only";

import { and, desc, eq, like, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { conversationMessages, conversations, workers } from "@/db/schema";

/**
A conversation is private to the member who created it.
*/
interface Owner {
  organizationId: string;
  userId: string;
}

const latestMessagePreview = sql<string | null>`(
  select ${conversationMessages.content}
  from ${conversationMessages}
  where ${conversationMessages.conversationId} = ${conversations.id}
  order by ${conversationMessages.createdAt} desc
  limit 1
)`;

function owned(owner: Owner, conversationId?: string) {
  return and(
    eq(conversations.organizationId, owner.organizationId),
    eq(conversations.createdByWorkosUserId, owner.userId),
    conversationId ? eq(conversations.id, conversationId) : undefined,
  );
}

export async function createConversation(
  owner: Owner,
  input: { agentId: string; title?: string },
) {
  const [agent] = await db
    .select({ id: workers.id })
    .from(workers)
    .where(
      and(
        eq(workers.organizationId, owner.organizationId),
        eq(workers.id, input.agentId),
      ),
    )
    .limit(1);
  if (!agent) return;

  const [conversation] = await db
    .insert(conversations)
    .values({
      organizationId: owner.organizationId,
      createdByWorkosUserId: owner.userId,
      workerId: input.agentId,
      title: input.title,
    })
    .returning({ id: conversations.id });
  return conversation;
}

/**
 * The owner's conversations, newest first, with the agent and its kind so the
 * UI can group them by mode. `query` filters on title or agent name.
 */
export function listConversations(owner: Owner, query?: string) {
  const search = query?.trim();
  return db
    .select({
      id: conversations.id,
      agentId: conversations.workerId,
      agentName: workers.name,
      kind: workers.baseAgentId,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
      latestMessagePreview,
    })
    .from(conversations)
    .innerJoin(workers, eq(conversations.workerId, workers.id))
    .where(
      and(
        owned(owner),
        search
          ? or(
              like(conversations.title, `%${search}%`),
              like(workers.name, `%${search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversation(owner: Owner, conversationId: string) {
  const [conversation] = await db
    .select({
      id: conversations.id,
      agentId: conversations.workerId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(owned(owner, conversationId))
    .limit(1);
  return conversation;
}

export async function deleteConversation(owner: Owner, conversationId: string) {
  const [deleted] = await db
    .delete(conversations)
    .where(owned(owner, conversationId))
    .returning({ id: conversations.id });
  return deleted;
}

export async function renameConversation(
  owner: Owner,
  conversationId: string,
  title: string,
) {
  const [renamed] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(owned(owner, conversationId))
    .returning({ id: conversations.id, title: conversations.title });
  return renamed;
}

export interface NewConversationMessage {
  conversationId: string;
  role: "user" | "worker";
  content: string;
  isError?: boolean;
  isPartial?: boolean;
  userQuestionOptions?: { label: string; description?: string }[];
  userQuestionSelectionMode?: "single_select" | "multi_select";
  modelId?: string;
  runtimeRunId?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export async function createConversationMessage(
  owner: Owner,
  input: NewConversationMessage,
) {
  const conversation = await getConversation(owner, input.conversationId);
  if (!conversation) return;

  const [message] = await db
    .insert(conversationMessages)
    .values({ ...input, organizationId: owner.organizationId })
    .returning({
      id: conversationMessages.id,
      role: conversationMessages.role,
      content: conversationMessages.content,
      isError: conversationMessages.isError,
      createdAt: conversationMessages.createdAt,
    });
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, input.conversationId));
  return message;
}

export async function listConversationMessages(
  owner: Owner,
  conversationId: string,
) {
  const conversation = await getConversation(owner, conversationId);
  if (!conversation) return;

  return db
    .select({
      id: conversationMessages.id,
      role: conversationMessages.role,
      content: conversationMessages.content,
      isError: conversationMessages.isError,
      isPartial: conversationMessages.isPartial,
      userQuestionOptions: conversationMessages.userQuestionOptions,
      userQuestionSelectionMode: conversationMessages.userQuestionSelectionMode,
      createdAt: conversationMessages.createdAt,
    })
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.organizationId, owner.organizationId),
        eq(conversationMessages.conversationId, conversationId),
      ),
    )
    .orderBy(conversationMessages.createdAt);
}
