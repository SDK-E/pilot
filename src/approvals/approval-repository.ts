import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { approvals, conversations, tasks } from "@/db/schema";
export async function listApprovals(organizationId: string) {
  return db
    .select({
      id: approvals.id,
      summary: approvals.summary,
      status: approvals.status,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .where(eq(approvals.organizationId, organizationId))
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
