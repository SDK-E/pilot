import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, tasks } from "@/db/schema";

export async function createTask(input: {
  organizationId: string;
  createdByWorkosUserId: string;
  title: string;
  instructions: string;
}) {
  const [task] = await db
    .insert(tasks)
    .values({ ...input, status: "ready" })
    .returning({ id: tasks.id });
  return task;
}

export async function listTasks(organizationId: string) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.organizationId, organizationId))
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
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(desc(tasks.updatedAt));
}
