import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  conversations,
  conversationScratchpads,
  executions,
} from "@/db/schema";

export async function getConversationScratchpad(input: {
  organizationId: string;
  conversationId: string;
  userId: string;
}) {
  const [scratchpad] = await db
    .select({ content: conversationScratchpads.content })
    .from(conversationScratchpads)
    .innerJoin(
      conversations,
      eq(conversationScratchpads.conversationId, conversations.id),
    )
    .where(
      and(
        eq(conversationScratchpads.organizationId, input.organizationId),
        eq(conversationScratchpads.conversationId, input.conversationId),
        eq(conversationScratchpads.createdByWorkosUserId, input.userId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .limit(1);
  return scratchpad?.content ?? "";
}

async function getRuntimeConversation(input: {
  organizationId: string;
  executionId: string;
}) {
  const [execution] = await db
    .select({
      workerId: executions.workerId,
      conversationId: executions.conversationId,
      userId: conversations.createdByWorkosUserId,
    })
    .from(executions)
    .innerJoin(conversations, eq(executions.conversationId, conversations.id))
    .where(
      and(
        eq(executions.organizationId, input.organizationId),
        eq(executions.id, input.executionId),
        inArray(executions.status, ["running", "awaiting_approval"]),
        eq(conversations.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  return execution;
}

/**
 * Pilot AI can reach this only through its OIDC-authenticated callback. The
 * execution record, rather than callback input, determines every owner and
 * resource identifier used for the read or write.
 */
export async function readRuntimeConversationScratchpad(input: {
  organizationId: string;
  executionId: string;
}) {
  const execution = await getRuntimeConversation(input);
  if (!execution) return undefined;
  const content = await getConversationScratchpad({
    organizationId: input.organizationId,
    conversationId: execution.conversationId,
    userId: execution.userId,
  });
  return { content, conversationId: execution.conversationId };
}

export async function writeRuntimeConversationScratchpad(input: {
  organizationId: string;
  executionId: string;
  content: string;
}) {
  const execution = await getRuntimeConversation(input);
  if (!execution) return undefined;
  const [scratchpad] = await db
    .insert(conversationScratchpads)
    .values({
      organizationId: input.organizationId,
      workerId: execution.workerId,
      conversationId: execution.conversationId,
      createdByWorkosUserId: execution.userId,
      content: input.content,
    })
    .onConflictDoUpdate({
      target: conversationScratchpads.conversationId,
      set: { content: input.content, updatedAt: new Date() },
    })
    .returning({ content: conversationScratchpads.content });
  return scratchpad;
}
