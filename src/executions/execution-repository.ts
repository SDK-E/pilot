import "server-only";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { activityEvents, executions } from "@/db/schema";

export async function startExecution(input: {
  organizationId: string;
  workerId: string;
  conversationId: string;
}) {
  const [execution] = await db
    .insert(executions)
    .values({ ...input, status: "running" })
    .returning({ id: executions.id });
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
      ),
    )
    .returning({ id: executions.id });
  if (execution)
    await db.insert(activityEvents).values({
      organizationId: input.organizationId,
      executionId: execution.id,
      type: status === "completed" ? "execution.completed" : "execution.failed",
      summary:
        status === "completed" ? "Response completed" : "Response failed",
    });
}

export async function listConversationActivity(
  organizationId: string,
  conversationId: string,
) {
  return db
    .select({
      id: activityEvents.id,
      executionId: activityEvents.executionId,
      type: activityEvents.type,
      summary: activityEvents.summary,
      createdAt: activityEvents.createdAt,
    })
    .from(activityEvents)
    .innerJoin(executions, eq(activityEvents.executionId, executions.id))
    .where(
      and(
        eq(activityEvents.organizationId, organizationId),
        eq(executions.organizationId, organizationId),
        eq(executions.conversationId, conversationId),
      ),
    )
    .orderBy(asc(activityEvents.createdAt));
}

export async function getOrganizationExecutionMetrics(organizationId: string) {
  const [running] = await db
    .select({ value: count() })
    .from(executions)
    .where(
      and(
        eq(executions.organizationId, organizationId),
        eq(executions.status, "running"),
      ),
    );

  return { running: running?.value ?? 0 };
}
