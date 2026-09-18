import "server-only";
import { and, eq, inArray, lt, sql, type SQL } from "drizzle-orm";

import { AGENT_RUN_MAX_STEPS, type AgentKindId } from "@/agents/agent-kinds";
import { db } from "@/db/client";
import { agentRuns, conversations } from "@/db/schema";
import { finishExecution } from "@/executions/execution-repository";

const NON_TERMINAL_STATUSES = [
  "running",
  "cancelling",
  "needs_continuation",
] as const;

// Same reasoning as execution-repository.ts's STALE_EXECUTION_MS: comfortably
// longer than a turn could legitimately take (see conversation-turn.ts's
// STREAM_TIMEOUT_MS plus its one retry), so this only ever reaps a run
// abandoned by a crash or a killed function — or one whose continuation sweep
// (`/api/cron/continue-runs`) itself stopped running — never one still
// genuinely in flight or waiting for its next scheduled continuation.
const STALE_AGENT_RUN_MS = 10 * 60 * 1000;

// Caps how many internal-timeout continuations one turn can accumulate
// before it's treated as a real failure instead of resumed again. At up to
// ~260s of model work per continuation (STREAM_TIMEOUT_MS), this bounds a
// single turn to roughly two hours of chunked wall-clock time — generous for
// a genuine long Work run, but not unbounded.
const MAX_CONTINUATIONS = 24;

/**
 * Closes a batch of non-terminal agent runs matched by `scope` (plus the
 * shared staleness cutoff). Shared by the conversation-scoped and global
 * reapers below so the close semantics never drift between them.
 */
async function reapAgentRunsMatching(scope?: SQL) {
  const staleBefore = new Date(Date.now() - STALE_AGENT_RUN_MS);
  await db
    .update(agentRuns)
    .set({
      status: "failed",
      errorMessage:
        "Closed by the stale-run reaper: abandoned mid-run, most likely by a crash, a redeploy, or a stopped continuation sweep.",
      completedAt: new Date(),
    })
    .where(
      and(
        scope,
        inArray(agentRuns.status, NON_TERMINAL_STATUSES),
        lt(agentRuns.updatedAt, staleBefore),
      ),
    );
}

/**
 * Closes any run for this conversation left non-terminal well past how long
 * a turn could legitimately take. Mirrors `reapStaleExecutions` — without
 * it, a run abandoned mid-turn (a crash, a redeploy, a killed function)
 * would show as perpetually in progress with no path back to a usable
 * conversation.
 */
async function reapStaleAgentRuns(input: {
  organizationId: string;
  conversationId: string;
}) {
  await reapAgentRunsMatching(
    and(
      eq(agentRuns.organizationId, input.organizationId),
      eq(agentRuns.conversationId, input.conversationId),
    ),
  );
}

/**
 * Global counterpart to `reapStaleAgentRuns`, with no `conversationId` (or
 * `organizationId`) filter — closes every stale non-terminal run across
 * every organization. Conversation-scoped reaping only runs when that same
 * conversation happens to start its next turn; a conversation abandoned
 * after a crash and never revisited would otherwise stay non-terminal
 * forever. Intended to be driven by a periodic sweep (see the
 * `/api/cron/reap-stale-runs` route), not by any per-request path.
 */
export async function reapAllStaleAgentRuns() {
  await reapAgentRunsMatching();
}

/**
 * Opens the durable run record for a turn's execution — every agent kind
 * gets one (see ADR-0025/ADR-0026), carrying that kind's step budget and
 * the state needed to detect a crash, a cancellation, or an internal-timeout
 * continuation.
 *
 * A turn resuming one `/api/cron/continue-runs` claimed (`continuingRunId`)
 * re-points that same row at this chunk's new `executionId` instead of
 * inserting a second row — `executionId` is unique per row, but a logical
 * run spans a different execution per chunk, so the row has to move with
 * it. This is what keeps `stepCount`/`continuationCount` cumulative across
 * chunks and keeps `getActiveAgentRun`/cancellation looking at one row per
 * conversation, not one per chunk.
 */
export async function startAgentRun(input: {
  organizationId: string;
  workerId: string;
  conversationId: string;
  executionId: string;
  kind: AgentKindId;
  continuingRunId?: string;
}) {
  await reapStaleAgentRuns(input);
  if (input.continuingRunId) {
    const [run] = await db
      .update(agentRuns)
      .set({
        executionId: input.executionId,
        status: "running",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(agentRuns.id, input.continuingRunId),
          eq(agentRuns.organizationId, input.organizationId),
        ),
      )
      .returning({ id: agentRuns.id });
    if (run) return run;
  }
  const [run] = await db
    .insert(agentRuns)
    .values({
      organizationId: input.organizationId,
      workerId: input.workerId,
      conversationId: input.conversationId,
      executionId: input.executionId,
      status: "running",
      maxSteps: AGENT_RUN_MAX_STEPS[input.kind],
    })
    .returning({ id: agentRuns.id });
  return run;
}

/**
 * Records one tool/skill step against the run for this execution. Called
 * from the runtime activity callback for every conversation.
 */
export async function recordAgentRunStep(input: {
  organizationId: string;
  executionId: string;
}) {
  await db
    .update(agentRuns)
    .set({
      stepCount: sql`${agentRuns.stepCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(agentRuns.organizationId, input.organizationId),
        eq(agentRuns.executionId, input.executionId),
        inArray(agentRuns.status, ["running", "cancelling"]),
      ),
    );
}

/**
 * Marks the run for a completed/failed turn with its final status. Mirrors
 * `finishExecution`'s own guard: only a run still in a non-terminal status
 * is updated, so a late callback from an already-closed (reaped or
 * cancelled) run is a safe no-op.
 */
export async function finishAgentRun(input: {
  organizationId: string;
  executionId: string;
  errorMessage?: string;
}) {
  await db
    .update(agentRuns)
    .set({
      status: input.errorMessage ? "failed" : "completed",
      errorMessage: input.errorMessage,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(agentRuns.organizationId, input.organizationId),
        eq(agentRuns.executionId, input.executionId),
        inArray(agentRuns.status, NON_TERMINAL_STATUSES),
      ),
    );
}

/**
 * Marks a turn cut off by its own internal time budget (not by an error or
 * a user stop) as `needs_continuation` instead of finishing it, so
 * `/api/cron/continue-runs` picks it up and resumes it automatically. Once
 * `MAX_CONTINUATIONS` is reached, returns `false` so the caller treats this
 * chunk as a real failure instead of deferring again.
 */
export async function didMarkAgentRunNeedsContinuation(input: {
  organizationId: string;
  executionId: string;
}): Promise<boolean> {
  const [run] = await db
    .update(agentRuns)
    .set({
      status: "needs_continuation",
      continuationCount: sql`${agentRuns.continuationCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(agentRuns.organizationId, input.organizationId),
        eq(agentRuns.executionId, input.executionId),
        inArray(agentRuns.status, ["running", "cancelling"]),
        lt(agentRuns.continuationCount, MAX_CONTINUATIONS),
      ),
    )
    .returning({ id: agentRuns.id });
  return !!run;
}

/**
 * Immediately and deliberately closes the active run for this conversation,
 * instead of waiting for the stale-run reaper's ten-minute timeout. This is
 * what the UI's cancel action calls, for any agent kind.
 *
 * It closes the durable record and the underlying `executions` row (via the
 * existing `finishExecution`, so `hasRunningExecution` frees the
 * conversation for a new turn right away) — it does not, by itself, stop
 * compute already in flight on the original request. If that request is
 * still being served from the same browser tab, the existing Stop control
 * (`use-conversation-stream.ts`) aborts its fetch, which is still the only
 * way to interrupt the model call itself; if it's a different device, a
 * closed tab, or an in-progress continuation chunk, the in-flight call runs
 * to its own completion or its internal timeout, but the conversation is
 * unblocked immediately rather than staying wedged. Cancelling also stops
 * `/api/cron/continue-runs` from resuming this run again, since its status
 * is no longer `needs_continuation`.
 */
export async function didCancelAgentRun(input: {
  organizationId: string;
  conversationId: string;
}): Promise<boolean> {
  const now = new Date();
  const [run] = await db
    .update(agentRuns)
    .set({
      status: "cancelled",
      cancelRequestedAt: now,
      completedAt: now,
      errorMessage: "Cancelled by user request.",
    })
    .where(
      and(
        eq(agentRuns.organizationId, input.organizationId),
        eq(agentRuns.conversationId, input.conversationId),
        inArray(agentRuns.status, NON_TERMINAL_STATUSES),
      ),
    )
    .returning({ id: agentRuns.id, executionId: agentRuns.executionId });
  if (!run) return false;
  await finishExecution({
    organizationId: input.organizationId,
    executionId: run.executionId,
    errorMessage: "Cancelled by user request.",
  });
  return true;
}

/**
 * The conversation's active run, if any — creator-scoped the same way
 * `listConversationActivity` is, via a join to `conversations`, since
 * membership in the organization alone never grants access to another
 * member's conversation.
 */
export async function getActiveAgentRun(
  organizationId: string,
  conversationId: string,
  userId: string,
) {
  const [run] = await db
    .select({
      id: agentRuns.id,
      status: agentRuns.status,
      stepCount: agentRuns.stepCount,
      maxSteps: agentRuns.maxSteps,
      startedAt: agentRuns.startedAt,
    })
    .from(agentRuns)
    .innerJoin(conversations, eq(agentRuns.conversationId, conversations.id))
    .where(
      and(
        eq(agentRuns.organizationId, organizationId),
        eq(agentRuns.conversationId, conversationId),
        eq(conversations.createdByWorkosUserId, userId),
        inArray(agentRuns.status, NON_TERMINAL_STATUSES),
      ),
    )
    .limit(1);
  return run;
}

/**
 * Atomically claims up to `limit` runs marked `needs_continuation` by
 * flipping them to `running` (`WHERE status = 'needs_continuation'`, so a
 * concurrent cron tick or reaper pass can never double-claim the same row),
 * returning what `/api/cron/continue-runs` needs to resume each one without
 * a further lookup.
 */
export async function claimRunsNeedingContinuation(limit: number) {
  const candidates = await db
    .select({
      id: agentRuns.id,
      organizationId: agentRuns.organizationId,
      conversationId: agentRuns.conversationId,
      executionId: agentRuns.executionId,
      workerId: agentRuns.workerId,
      userId: conversations.createdByWorkosUserId,
    })
    .from(agentRuns)
    .innerJoin(conversations, eq(agentRuns.conversationId, conversations.id))
    .where(eq(agentRuns.status, "needs_continuation"))
    .limit(limit);

  const claimed: typeof candidates = [];
  for (const candidate of candidates) {
    const [run] = await db
      .update(agentRuns)
      .set({ status: "running", updatedAt: new Date() })
      .where(
        and(
          eq(agentRuns.id, candidate.id),
          eq(agentRuns.status, "needs_continuation"),
        ),
      )
      .returning({ id: agentRuns.id });
    if (run) claimed.push(candidate);
  }
  return claimed;
}
