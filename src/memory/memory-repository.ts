import "server-only";

import { and, desc, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db/client";
import { memories } from "@/db/schema";

export type MemoryScope = "conversation" | "project" | "user" | "organization";

const memoryColumns = {
  id: memories.id,
  scope: memories.scope,
  conversationId: memories.conversationId,
  projectId: memories.projectId,
  createdByWorkosUserId: memories.createdByWorkosUserId,
  content: memories.content,
  createdAt: memories.createdAt,
  updatedAt: memories.updatedAt,
};

export type Memory = Awaited<
  ReturnType<typeof listOrganizationMemories>
>[number];

/**
 * Every organization-scope note — visible to every member, admin-managed
 * from Settings.
 */
export function listOrganizationMemories(organizationId: string) {
  return db
    .select(memoryColumns)
    .from(memories)
    .where(
      and(
        eq(memories.organizationId, organizationId),
        eq(memories.scope, "organization"),
      ),
    )
    .orderBy(desc(memories.createdAt));
}

/**
 * One member's own user-scope notes — personal, never visible to anyone else.
 */
export function listUserMemories(organizationId: string, workosUserId: string) {
  return db
    .select(memoryColumns)
    .from(memories)
    .where(
      and(
        eq(memories.organizationId, organizationId),
        eq(memories.scope, "user"),
        eq(memories.createdByWorkosUserId, workosUserId),
      ),
    )
    .orderBy(desc(memories.createdAt));
}

export function listProjectMemories(
  organizationId: string,
  workosUserId: string,
  projectId: string,
) {
  return db
    .select(memoryColumns)
    .from(memories)
    .where(
      and(
        eq(memories.organizationId, organizationId),
        eq(memories.scope, "project"),
        eq(memories.projectId, projectId),
        eq(memories.createdByWorkosUserId, workosUserId),
      ),
    )
    .orderBy(desc(memories.createdAt));
}

export function listConversationMemories(
  organizationId: string,
  workosUserId: string,
  conversationId: string,
) {
  return db
    .select(memoryColumns)
    .from(memories)
    .where(
      and(
        eq(memories.organizationId, organizationId),
        eq(memories.scope, "conversation"),
        eq(memories.conversationId, conversationId),
        eq(memories.createdByWorkosUserId, workosUserId),
      ),
    )
    .orderBy(desc(memories.createdAt));
}

export async function createMemory(input: {
  organizationId: string;
  createdByWorkosUserId: string;
  scope: MemoryScope;
  content: string;
  conversationId?: string;
  projectId?: string;
}) {
  const [created] = await db
    .insert(memories)
    .values({
      organizationId: input.organizationId,
      createdByWorkosUserId: input.createdByWorkosUserId,
      scope: input.scope,
      content: input.content,
      conversationId:
        input.scope === "conversation" ? input.conversationId : null,
      projectId: input.scope === "project" ? input.projectId : null,
    })
    .returning({ id: memories.id });
  return created;
}

/**
 * Deletes a note — only the note's own author may do this, an organization
 * admin included, since a note is always personally authored even when its
 * scope makes it visible to the whole org.
 */
export async function deleteMemory(input: {
  organizationId: string;
  workosUserId: string;
  memoryId: string;
}) {
  const [deleted] = await db
    .delete(memories)
    .where(
      and(
        eq(memories.id, input.memoryId),
        eq(memories.organizationId, input.organizationId),
        eq(memories.createdByWorkosUserId, input.workosUserId),
      ),
    )
    .returning({ id: memories.id });
  return deleted;
}

/**
 * Every note that applies to one turn: the organization's own notes, this
 * member's personal notes, this project's notes (if the conversation
 * belongs to one), and this conversation's own notes — gathered in one
 * query per scope, broadest first, for `resolveInstructions` to render.
 */
export async function resolveMemoryContext(input: {
  organizationId: string;
  userId: string;
  conversationId: string;
  projectId?: string;
}): Promise<{ scope: MemoryScope; content: string }[]> {
  const rows = await db
    .select({
      scope: memories.scope,
      content: memories.content,
      createdByWorkosUserId: memories.createdByWorkosUserId,
      conversationId: memories.conversationId,
      projectId: memories.projectId,
    })
    .from(memories)
    .where(
      and(
        eq(memories.organizationId, input.organizationId),
        or(
          eq(memories.scope, "organization"),
          and(
            eq(memories.scope, "user"),
            eq(memories.createdByWorkosUserId, input.userId),
          ),
          and(
            eq(memories.scope, "conversation"),
            eq(memories.conversationId, input.conversationId),
            eq(memories.createdByWorkosUserId, input.userId),
          ),
          input.projectId
            ? and(
                eq(memories.scope, "project"),
                eq(memories.projectId, input.projectId),
                eq(memories.createdByWorkosUserId, input.userId),
              )
            : isNull(memories.id), // never matches — no project for this turn
        ),
      ),
    )
    .orderBy(desc(memories.createdAt));
  return rows.map((row) => ({ scope: row.scope, content: row.content }));
}
