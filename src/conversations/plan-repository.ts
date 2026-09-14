import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  conversationPlans,
  conversations,
  executions,
  type ConversationPlanStep,
} from "@/db/schema";

export async function getConversationPlan(input: {
  organizationId: string;
  conversationId: string;
  userId: string;
}): Promise<ConversationPlanStep[]> {
  const [plan] = await db
    .select({ steps: conversationPlans.steps })
    .from(conversationPlans)
    .innerJoin(
      conversations,
      eq(conversationPlans.conversationId, conversations.id),
    )
    .where(
      and(
        eq(conversationPlans.organizationId, input.organizationId),
        eq(conversationPlans.conversationId, input.conversationId),
        eq(conversationPlans.createdByWorkosUserId, input.userId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .limit(1);
  return plan?.steps ?? [];
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
export async function readRuntimeConversationPlan(input: {
  organizationId: string;
  executionId: string;
}) {
  const execution = await getRuntimeConversation(input);
  if (!execution) return;
  const steps = await getConversationPlan({
    organizationId: input.organizationId,
    conversationId: execution.conversationId,
    userId: execution.userId,
  });
  return { steps, conversationId: execution.conversationId };
}

export async function writeRuntimeConversationPlan(input: {
  organizationId: string;
  executionId: string;
  steps: ConversationPlanStep[];
}) {
  const execution = await getRuntimeConversation(input);
  if (!execution) return;
  const [plan] = await db
    .insert(conversationPlans)
    .values({
      organizationId: input.organizationId,
      workerId: execution.workerId,
      conversationId: execution.conversationId,
      createdByWorkosUserId: execution.userId,
      steps: input.steps,
    })
    .onConflictDoUpdate({
      target: conversationPlans.conversationId,
      set: { steps: input.steps, updatedAt: new Date() },
    })
    .returning({ steps: conversationPlans.steps });
  return plan;
}
