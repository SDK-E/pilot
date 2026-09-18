import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { WORK_RUN_MAX_STEPS } from "@/agents/agent-kinds";
import { db } from "@/db/client";
import { conversations, workRuns } from "@/db/schema";
import { finishExecution } from "@/executions/execution-repository";

const NON_TERMINAL_STATUSES = ["running", "cancelling"] as const;

// Same reasoning as execution-repository.ts's STALE_EXECUTION_MS: comfortably
// longer than a turn could legitimately take (see conversation-turn.ts's
// STREAM_TIMEOUT_MS plus its one retry), so this only ever reaps a run
// abandoned by a crash or a killed function, never one still genuinely in
// flight.
const STALE_WORK_RUN_MS = 10 * 60 * 1000;

/**
 * Closes any Work run for this conversation left `running`/`cancelling`
 * well past how long a turn could legitimately take. Mirrors
 * `reapStaleExecutions` — without it, a Work run abandoned mid-turn (a
 * crash, a redeploy, a killed function) would show as perpetually in
 * progress with no path back to a usable conversation.
 */
async function reapStaleWorkRuns(input: {
  organizationId: string;
  conversationId: string;
}) {
  const staleBefore = new Date(Date.now() - STALE_WORK_RUN_MS);
  await db
    .update(workRuns)
    .set({
      status: "failed",
      errorMessage:
        "Closed by the stale-run reaper: abandoned mid-run, most likely by a crash or redeploy.",
      completedAt: new Date(),
    })
    .where(
      and(
        eq(workRuns.organizationId, input.organizationId),
        eq(workRuns.conversationId, input.conversationId),
        inArray(workRuns.status, NON_TERMINAL_STATUSES),
        lt(workRuns.startedAt, staleBefore),
      ),
    );
}

/**
 * Opens the durable Work-run record for a turn's execution. Called only
 * when the turn's agent kind is `work` — Chat and Code never get a row
 * here, so their synchronous request/response behavior is untouched.
 */
export async function startWorkRun(input: {
  organizationId: string;
  workerId: string;
  conversationId: string;
  executionId: string;
}) {
  await reapStaleWorkRuns(input);
  const [run] = await db
    .insert(workRuns)
    .values({
      organizationId: input.organizationId,
      workerId: input.workerId,
      conversationId: input.conversationId,
      executionId: input.executionId,
      status: "running",
      maxSteps: WORK_RUN_MAX_STEPS,
    })
    .returning({ id: workRuns.id });
  return run;
}

/**
 * Records one tool/skill step against the Work run for this execution, if
 * one exists. Called from the runtime activity callback for every kind of
 * conversation; a no-op for Chat and Code, which never have a `work_runs`
 * row for their execution.
 */
export async function recordWorkRunStep(input: {
  organizationId: string;
  executionId: string;
}) {
  await db
    .update(workRuns)
    .set({
      stepCount: sql`${workRuns.stepCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workRuns.organizationId, input.organizationId),
        eq(workRuns.executionId, input.executionId),
        inArray(workRuns.status, NON_TERMINAL_STATUSES),
      ),
    );
}

/**
 * Marks the Work run for a completed/failed turn with its final status.
 * Mirrors `finishExecution`'s own guard: only a run still in a non-terminal
 * status is updated, so a late callback from an already-closed (reaped or
 * cancelled) run is a safe no-op.
 */
export async function finishWorkRun(input: {
  organizationId: string;
  executionId: string;
  errorMessage?: string;
}) {
  await db
    .update(workRuns)
    .set({
      status: input.errorMessage ? "failed" : "completed",
      errorMessage: input.errorMessage,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(workRuns.organizationId, input.organizationId),
        eq(workRuns.executionId, input.executionId),
        inArray(workRuns.status, NON_TERMINAL_STATUSES),
      ),
    );
}

/**
 * Immediately and deliberately closes the active Work run for this
 * conversation, instead of waiting for the stale-run reaper's ten-minute
 * timeout. This is what the UI's cancel action calls.
 *
 * It closes the durable record and the underlying `executions` row (via
 * the existing `finishExecution`, so `hasRunningExecution` frees the
 * conversation for a new turn right away) — it does not, by itself, stop
 * compute already in flight on the original request. If that request is
 * still being served from the same browser tab, the existing Stop control
 * (`use-conversation-stream.ts`) aborts its fetch, which is still the only
 * way to interrupt the model call itself; if it's a different device or a
 * closed tab, the in-flight call runs to its own completion or timeout, but
 * the conversation is unblocked immediately rather than staying wedged for
 * up to ten minutes. Real mid-run interruption from any device needs the
 * background dispatch loop described in ADR-0025's "Deferred" section.
 */
export async function didCancelWorkRun(input: {
  organizationId: string;
  conversationId: string;
}): Promise<boolean> {
  const now = new Date();
  const [run] = await db
    .update(workRuns)
    .set({
      status: "cancelled",
      cancelRequestedAt: now,
      completedAt: now,
      errorMessage: "Cancelled by user request.",
    })
    .where(
      and(
        eq(workRuns.organizationId, input.organizationId),
        eq(workRuns.conversationId, input.conversationId),
        inArray(workRuns.status, NON_TERMINAL_STATUSES),
      ),
    )
    .returning({ id: workRuns.id, executionId: workRuns.executionId });
  if (!run) return false;
  await finishExecution({
    organizationId: input.organizationId,
    executionId: run.executionId,
    errorMessage: "Cancelled by user request.",
  });
  return true;
}

/**
 * The conversation's active Work run, if any — creator-scoped the same way
 * `listConversationActivity` is, via a join to `conversations`, since
 * membership in the organization alone never grants access to another
 * member's conversation.
 */
export async function getActiveWorkRun(
  organizationId: string,
  conversationId: string,
  userId: string,
) {
  const [run] = await db
    .select({
      id: workRuns.id,
      status: workRuns.status,
      stepCount: workRuns.stepCount,
      maxSteps: workRuns.maxSteps,
      startedAt: workRuns.startedAt,
    })
    .from(workRuns)
    .innerJoin(conversations, eq(workRuns.conversationId, conversations.id))
    .where(
      and(
        eq(workRuns.organizationId, organizationId),
        eq(workRuns.conversationId, conversationId),
        eq(conversations.createdByWorkosUserId, userId),
        inArray(workRuns.status, NON_TERMINAL_STATUSES),
      ),
    )
    .limit(1);
  return run;
}
