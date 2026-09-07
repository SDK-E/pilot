import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, workers } from "@/db/schema";

export async function createConversation(input: {
  organizationId: string;
  workerId: string;
  createdByWorkosUserId: string;
  title?: string;
}) {
  const [worker] = await db
    .select({ id: workers.id })
    .from(workers)
    .where(
      and(
        eq(workers.organizationId, input.organizationId),
        eq(workers.id, input.workerId),
      ),
    )
    .limit(1);
  if (!worker) return undefined;

  const [conversation] = await db
    .insert(conversations)
    .values(input)
    .returning({ id: conversations.id, createdAt: conversations.createdAt });
  return conversation;
}

export async function listConversations(
  organizationId: string,
  workerId: string,
) {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.workerId, workerId),
      ),
    )
    .orderBy(desc(conversations.updatedAt));
}

export async function listOrganizationConversations(organizationId: string) {
  return db
    .select({
      id: conversations.id,
      workerId: conversations.workerId,
      agentName: workers.name,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .innerJoin(workers, eq(conversations.workerId, workers.id))
    .where(
      and(
        eq(conversations.organizationId, organizationId),
        eq(workers.organizationId, organizationId),
      ),
    )
    .orderBy(desc(conversations.updatedAt));
}

export async function listRecentOrganizationConversations(
  organizationId: string,
  limit = 8,
) {
  return db
    .select({
      id: conversations.id,
      workerId: conversations.workerId,
      agentName: workers.name,
      title: conversations.title,
    })
    .from(conversations)
    .innerJoin(workers, eq(conversations.workerId, workers.id))
    .where(
      and(
        eq(conversations.organizationId, organizationId),
        eq(workers.organizationId, organizationId),
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}

export async function getOrganizationConversationMetrics(
  organizationId: string,
) {
  const [[agents], [chatCount], [usage]] = await Promise.all([
    db
      .select({ value: count() })
      .from(workers)
      .where(eq(workers.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId)),
    db
      .select({
        tokens: sql<number>`coalesce(sum(${conversationMessages.totalTokens}), 0)`,
        responses: count(),
      })
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.organizationId, organizationId),
          eq(conversationMessages.role, "worker"),
        ),
      ),
  ]);
  return {
    agents: agents?.value ?? 0,
    conversations: chatCount?.value ?? 0,
    totalTokens: Number(usage?.tokens ?? 0),
    completedResponses: usage?.responses ?? 0,
  };
}

export async function getConversation(
  organizationId: string,
  workerId: string,
  conversationId: string,
) {
  const [conversation] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.workerId, workerId),
        eq(conversations.id, conversationId),
      ),
    )
    .limit(1);
  return conversation;
}

export async function deleteConversation(
  organizationId: string,
  workerId: string,
  conversationId: string,
) {
  const [deleted] = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.workerId, workerId),
        eq(conversations.id, conversationId),
      ),
    )
    .returning({ id: conversations.id });
  return deleted;
}

type ConversationMessageInput = {
  organizationId: string;
  workerId: string;
  conversationId: string;
  role: "user" | "worker";
  content: string;
  modelId?: string;
  runtimeRunId?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export async function createConversationMessage(
  input: ConversationMessageInput,
) {
  const conversation = await getConversation(
    input.organizationId,
    input.workerId,
    input.conversationId,
  );
  if (!conversation) return undefined;

  const [message] = await db
    .insert(conversationMessages)
    .values({
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      modelId: input.modelId,
      runtimeRunId: input.runtimeRunId,
      latencyMs: input.latencyMs,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      totalTokens: input.totalTokens,
    })
    .returning({
      id: conversationMessages.id,
      role: conversationMessages.role,
      content: conversationMessages.content,
      createdAt: conversationMessages.createdAt,
    });

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, input.conversationId));

  return message;
}

export async function listConversationMessages(
  organizationId: string,
  workerId: string,
  conversationId: string,
) {
  const conversation = await getConversation(
    organizationId,
    workerId,
    conversationId,
  );
  if (!conversation) return undefined;

  return db
    .select({
      id: conversationMessages.id,
      role: conversationMessages.role,
      content: conversationMessages.content,
      modelId: conversationMessages.modelId,
      runtimeRunId: conversationMessages.runtimeRunId,
      latencyMs: conversationMessages.latencyMs,
      inputTokens: conversationMessages.inputTokens,
      outputTokens: conversationMessages.outputTokens,
      totalTokens: conversationMessages.totalTokens,
      createdAt: conversationMessages.createdAt,
    })
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.organizationId, organizationId),
        eq(conversationMessages.conversationId, conversationId),
      ),
    )
    .orderBy(conversationMessages.createdAt);
}
