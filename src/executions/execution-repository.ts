import "server-only";
import { and, asc, eq, inArray, lt } from "drizzle-orm";

import { db } from "@/db/client";
import { activityEvents, conversations, executions } from "@/db/schema";
import {
  createSkillActivity,
  createToolActivity,
  type ToolActivityState,
} from "@/executions/activity-event";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

// Comfortably longer than the stream route's own abort timer
// (STREAM_TIMEOUT_MS = 90s in conversation-turn.ts, including its one
// fallback-model retry) so this never races a turn that is still legitimately
// in flight - only one abandoned by a crash or a killed function before its
// own finishExecution ever ran.
const STALE_EXECUTION_MS = 5 * 60 * 1000;

/**
 * Closes any execution for this conversation that has sat in
 * running/awaiting_approval well past how long a turn could legitimately
 * take. Without this, a turn abandoned mid-flight (a crash, a killed
 * function) never reaches finishExecution, and
 * executions_conversation_active_unique then blocks that conversation from
 * starting a new turn forever.
 */
async function reapStaleExecutions(input: {
  organizationId: string;
  conversationId: string;
}) {
  const staleBefore = new Date(Date.now() - STALE_EXECUTION_MS);
  const reaped = await db
    .update(executions)
    .set({
      status: "failed",
      errorMessage: "Closed by the stale-execution reaper: abandoned mid-turn.",
      completedAt: new Date(),
    })
    .where(
      and(
        eq(executions.organizationId, input.organizationId),
        eq(executions.conversationId, input.conversationId),
        inArray(executions.status, ["running", "awaiting_approval"]),
        lt(executions.startedAt, staleBefore),
      ),
    )
    .returning({ id: executions.id });
  for (const execution of reaped) {
    await db.insert(activityEvents).values({
      organizationId: input.organizationId,
      executionId: execution.id,
      type: "execution.failed",
      summary: "Response failed",
    });
  }
}

/**
 * Opens an execution for a conversation, or returns undefined if one is
 * already running or awaiting approval there (executions_conversation_active_unique).
 * Callers should treat that the same as "could not start this turn" rather
 * than starting a second, overlapping one.
 */
export async function startExecution(input: {
  organizationId: string;
  workerId: string;
  conversationId: string;
}) {
  await reapStaleExecutions(input);
  let execution;
  try {
    [execution] = await db
      .insert(executions)
      .values({ ...input, status: "running" })
      .returning({ id: executions.id });
  } catch (error) {
    if (isUniqueViolation(error)) return;
    throw error;
  }
  if (execution)
    await db.insert(activityEvents).values({
      organizationId: input.organizationId,
      executionId: execution.id,
      type: "execution.started",
      summary: "Generating a response",
    });
  return execution;
}

export async function finishExecution(input: {
  organizationId: string;
  executionId: string;
  conversationMessageId?: string;
  runtimeRunId?: string | null;
  errorMessage?: string;
}) {
  const status = input.errorMessage
    ? ("failed" as const)
    : ("completed" as const);
  const [execution] = await db
    .update(executions)
    .set({
      status,
      runtimeRunId: input.runtimeRunId,
      errorMessage: input.errorMessage,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(executions.organizationId, input.organizationId),
        eq(executions.id, input.executionId),
        inArray(executions.status, ["running", "awaiting_approval"]),
      ),
    )
    .returning({ id: executions.id });
  if (execution)
    await db.insert(activityEvents).values({
      organizationId: input.organizationId,
      executionId: execution.id,
      conversationMessageId: input.conversationMessageId,
      type: status === "completed" ? "execution.completed" : "execution.failed",
      summary:
        status === "completed" ? "Response completed" : "Response failed",
    });
}

/**
 * Appends a concise, server-derived tool lifecycle event. This intentionally
 * accepts only a known capability and state so activity storage can never be
 * used to retain model prompts, tool payloads, URLs, secrets, or reasoning.
 */
export async function appendToolActivity(input: {
  organizationId: string;
  executionId: string;
  toolId: Parameters<typeof createToolActivity>[0]["toolId"];
  toolCallId?: string;
  state: ToolActivityState;
}) {
  const event = createToolActivity(input);
  const [execution] = await db
    .select({ id: executions.id })
    .from(executions)
    .where(
      and(
        eq(executions.organizationId, input.organizationId),
        eq(executions.id, input.executionId),
        inArray(executions.status, ["running", "awaiting_approval"]),
      ),
    )
    .limit(1);
  if (!execution) return;

  await db.insert(activityEvents).values({
    organizationId: input.organizationId,
    executionId: execution.id,
    type: event.type,
    toolId: event.toolId,
    toolCallId: event.toolCallId,
    summary: event.summary,
  });
}

/**
Persists only a validated, server-derived skill label for the active run.
*/
export async function appendSkillActivity(input: {
  organizationId: string;
  executionId: string;
  skillId: string;
}) {
  const event = createSkillActivity(input);
  const [execution] = await db
    .select({ id: executions.id })
    .from(executions)
    .where(
      and(
        eq(executions.organizationId, input.organizationId),
        eq(executions.id, input.executionId),
        inArray(executions.status, ["running", "awaiting_approval"]),
      ),
    )
    .limit(1);
  if (!execution) return;

  await db.insert(activityEvents).values({
    organizationId: input.organizationId,
    executionId: execution.id,
    type: event.type,
    summary: event.summary,
  });
}

export async function listConversationActivity(
  organizationId: string,
  conversationId: string,
  userId: string,
) {
  return db
    .select({
      id: activityEvents.id,
      executionId: activityEvents.executionId,
      conversationMessageId: activityEvents.conversationMessageId,
      type: activityEvents.type,
      toolId: activityEvents.toolId,
      toolCallId: activityEvents.toolCallId,
      summary: activityEvents.summary,
      createdAt: activityEvents.createdAt,
    })
    .from(activityEvents)
    .innerJoin(executions, eq(activityEvents.executionId, executions.id))
    .innerJoin(conversations, eq(executions.conversationId, conversations.id))
    .where(
      and(
        eq(activityEvents.organizationId, organizationId),
        eq(executions.organizationId, organizationId),
        eq(executions.conversationId, conversationId),
        eq(conversations.createdByWorkosUserId, userId),
      ),
    )
    .orderBy(asc(activityEvents.createdAt));
}
