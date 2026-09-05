import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, workers } from "@/db/schema";

export async function createConversation(input: {
  organizationId: string;
  workerId: string;
  createdByWorkosUserId: string;
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
