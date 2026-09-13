import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { conversations, tasks } from "@/db/schema";

export async function createTask(input: {
  organizationId: string;
  createdByWorkosUserId: string;
  conversationId?: string;
  workerId?: string;
  title: string;
  instructions: string;
}) {
  if (input.conversationId) {
    const conditions = [
      eq(conversations.organizationId, input.organizationId),
      eq(conversations.id, input.conversationId),
      eq(conversations.createdByWorkosUserId, input.createdByWorkosUserId),
    ];
    if (input.workerId)
      conditions.push(eq(conversations.workerId, input.workerId));

    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(...conditions))
      .limit(1);
    if (!conversation) return;
  }
  const [task] = await db
    .insert(tasks)
    .values({ ...input, status: "ready" })
    .returning({ id: tasks.id });
  return task;
}

export async function listTasks(input: {
  organizationId: string;
  userId: string;
}) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      updatedAt: tasks.updatedAt,
      workerId: tasks.workerId,
      conversationId: tasks.conversationId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.organizationId, input.organizationId),
        eq(tasks.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(desc(tasks.updatedAt));
}

export async function listConversationTasks(input: {
  organizationId: string;
  conversationId: string;
  userId: string;
}) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(conversations, eq(tasks.conversationId, conversations.id))
    .where(
      and(
        eq(tasks.organizationId, input.organizationId),
        eq(tasks.conversationId, input.conversationId),
        eq(tasks.createdByWorkosUserId, input.userId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(desc(tasks.updatedAt));
}

type UserManagedTaskStatus = "completed" | "cancelled";

/**
 * Users may conclude or cancel only their own queued/active work. Runtime
 * states remain server-controlled so a browser cannot make work appear to run.
 */
export async function updateUserManagedTaskStatus(input: {
  organizationId: string;
  userId: string;
  taskId: string;
  status: UserManagedTaskStatus;
}) {
  const [task] = await db
    .update(tasks)
    .set({ status: input.status, updatedAt: new Date() })
    .where(
      and(
        eq(tasks.organizationId, input.organizationId),
        eq(tasks.id, input.taskId),
        eq(tasks.createdByWorkosUserId, input.userId),
        eq(tasks.status, "ready"),
      ),
    )
    .returning({ id: tasks.id, status: tasks.status });
  return task;
}
