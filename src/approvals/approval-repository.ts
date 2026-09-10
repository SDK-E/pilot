import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { approvals, conversations, executions, tasks } from "@/db/schema";

const approvalToolCopy = {
  "web-search": {
    taskTitle: "Approve public web research",
    taskInstructions:
      "Pilot requested access to its protected public-web research capability.",
    summary: "Allow Pilot to search and read public web sources?",
  },
  scratchpad: {
    taskTitle: "Approve scratchpad update",
    taskInstructions:
      "Pilot requested access to update this chat's private scratchpad.",
    summary: "Allow Pilot to update this chat's private scratchpad?",
  },
} as const;

export async function listApprovals(input: {
  organizationId: string;
  userId: string;
}) {
  return db
    .select({
      id: approvals.id,
      summary: approvals.summary,
      status: approvals.status,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .innerJoin(tasks, eq(approvals.taskId, tasks.id))
    .innerJoin(conversations, eq(tasks.conversationId, conversations.id))
    .where(
      and(
        eq(approvals.organizationId, input.organizationId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(desc(approvals.createdAt));
}

export async function listConversationApprovals(input: {
  organizationId: string;
  conversationId: string;
  userId: string;
}) {
  return db
    .select({
      id: approvals.id,
      summary: approvals.summary,
      status: approvals.status,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .innerJoin(tasks, eq(approvals.taskId, tasks.id))
    .innerJoin(conversations, eq(tasks.conversationId, conversations.id))
    .where(
      and(
        eq(approvals.organizationId, input.organizationId),
        eq(tasks.conversationId, input.conversationId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(desc(approvals.createdAt));
}

/**
 * Called only by Pilot AI's OIDC-authenticated callback. The callback carries
 * no model-controlled content; this derives the task from the owned execution.
 */
export async function createRuntimeToolApproval(input: {
  organizationId: string;
  executionId: string;
  runtimeRunId: string;
  toolCallId: string;
  toolId: keyof typeof approvalToolCopy;
}) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: approvals.id })
      .from(approvals)
      .where(
        and(
          eq(approvals.organizationId, input.organizationId),
          eq(approvals.executionId, input.executionId),
          eq(approvals.runtimeRunId, input.runtimeRunId),
          eq(approvals.toolCallId, input.toolCallId),
        ),
      )
      .limit(1);
    if (existing) return existing;

    const [execution] = await tx
      .update(executions)
      .set({
        status: "awaiting_approval",
        runtimeRunId: input.runtimeRunId,
      })
      .where(
        and(
          eq(executions.organizationId, input.organizationId),
          eq(executions.id, input.executionId),
          eq(executions.status, "running"),
        ),
      )
      .returning({
        id: executions.id,
        conversationId: executions.conversationId,
        workerId: executions.workerId,
      });

    if (!execution) {
      const [created] = await tx
        .select({ id: approvals.id })
        .from(approvals)
        .where(
          and(
            eq(approvals.organizationId, input.organizationId),
            eq(approvals.executionId, input.executionId),
            eq(approvals.runtimeRunId, input.runtimeRunId),
            eq(approvals.toolCallId, input.toolCallId),
          ),
        )
        .limit(1);
      return created;
    }

    const copy = approvalToolCopy[input.toolId];
    const [task] = await tx
      .insert(tasks)
      .values({
        organizationId: input.organizationId,
        workerId: execution.workerId,
        conversationId: execution.conversationId,
        title: copy.taskTitle,
        instructions: copy.taskInstructions,
        status: "awaiting_approval",
        createdByWorkosUserId: "runtime",
      })
      .returning({ id: tasks.id });
    if (!task) throw new Error("Pilot could not create an approval task.");

    const [approval] = await tx
      .insert(approvals)
      .values({
        organizationId: input.organizationId,
        taskId: task.id,
        executionId: execution.id,
        runtimeRunId: input.runtimeRunId,
        toolCallId: input.toolCallId,
        toolId: input.toolId,
        summary: copy.summary,
      })
      .returning({ id: approvals.id });
    return approval;
  });
}

export async function claimConversationApproval(input: {
  approvalId: string;
  organizationId: string;
  conversationId: string;
  userId: string;
}) {
  const [approval] = await db
    .update(approvals)
    .set({ status: "deciding", decidedByWorkosUserId: input.userId })
    .from(tasks)
    .where(
      and(
        eq(approvals.id, input.approvalId),
        eq(approvals.organizationId, input.organizationId),
        eq(approvals.taskId, tasks.id),
        eq(tasks.conversationId, input.conversationId),
        eq(approvals.status, "pending"),
      ),
    )
    .returning({
      id: approvals.id,
      taskId: approvals.taskId,
      executionId: approvals.executionId,
      runtimeRunId: approvals.runtimeRunId,
      toolCallId: approvals.toolCallId,
      toolId: approvals.toolId,
    });
  return approval;
}

export async function completeConversationApproval(input: {
  approvalId: string;
  organizationId: string;
  userId: string;
  approved: boolean;
  taskId: string;
}) {
  await db
    .update(approvals)
    .set({
      status: input.approved ? "approved" : "rejected",
      decidedByWorkosUserId: input.userId,
      decidedAt: new Date(),
    })
    .where(
      and(
        eq(approvals.id, input.approvalId),
        eq(approvals.organizationId, input.organizationId),
        eq(approvals.status, "deciding"),
        eq(approvals.decidedByWorkosUserId, input.userId),
      ),
    );
  await db
    .update(tasks)
    .set({
      status: input.approved ? "completed" : "cancelled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.id, input.taskId),
        eq(tasks.organizationId, input.organizationId),
      ),
    );
}

export async function cancelClaimedConversationApproval(input: {
  approvalId: string;
  organizationId: string;
  userId: string;
  taskId: string;
}) {
  await db
    .update(approvals)
    .set({ status: "cancelled", decidedAt: new Date() })
    .where(
      and(
        eq(approvals.id, input.approvalId),
        eq(approvals.organizationId, input.organizationId),
        eq(approvals.status, "deciding"),
        eq(approvals.decidedByWorkosUserId, input.userId),
      ),
    );
  await db
    .update(tasks)
    .set({ status: "failed", updatedAt: new Date() })
    .where(
      and(
        eq(tasks.id, input.taskId),
        eq(tasks.organizationId, input.organizationId),
      ),
    );
}
