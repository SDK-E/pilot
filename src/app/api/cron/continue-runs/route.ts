import { buildContinuationPrompt } from "@/conversations/continuation-prompt";
import {
  getLatestMessage,
  getPrecedingUserMessage,
} from "@/conversations/conversation-message-repository";
import { streamMessage } from "@/conversations/conversation-turn";
import { loadRuntimeAgent } from "@/conversations/runtime-agent";
import {
  claimRunsNeedingContinuation,
  finishAgentRun,
} from "@/executions/agent-run-repository";
import { isVerifiedCronRequest } from "@/lib/cron-auth";

/**
 * The actual background dispatch loop for Work-run durability's previously
 * deferred piece (see ADR-0025's "Deferred" section and ADR-0026): resumes
 * every turn `conversation-turn.ts` cut off with `needs_continuation`
 * (internal-timeout budget hit, not a failure or a user stop) instead of
 * requiring the user to click Continue or even keep a tab open. Triggered by
 * the same external HTTP cron scheduler as `/api/cron/reap-stale-runs`, but
 * on a much tighter interval (down to cron-job.org's 1-minute minimum),
 * since a paused Work run should resume quickly. See `isVerifiedCronRequest`
 * for this route's authentication.
 *
 * Each resumed chunk is itself bounded by `conversation-turn.ts`'s own
 * internal timeout, so a run needing many chunks simply comes back through
 * `needs_continuation` again and is picked up by the next tick — this route
 * only drains as many chunks as fit in its own budget per invocation, not a
 * whole run at once.
 */
export const runtime = "nodejs";
export const maxDuration = 300;

// Leaves a margin below this Vercel plan's 300s hard ceiling so a chunk that
// is itself approaching conversation-turn.ts's own ~260s internal timeout
// still has room to finish and persist cleanly before this route's own
// function is killed.
const SWEEP_BUDGET_MS = 270_000;

async function drain(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done } = await reader.read();
      if (done) return;
    }
  } finally {
    reader.releaseLock();
  }
}

async function resumeOne(run: {
  id: string;
  organizationId: string;
  conversationId: string;
  executionId: string;
  workerId: string;
  userId: string;
}) {
  const latest = await getLatestMessage(run.organizationId, run.conversationId);
  if (latest?.role !== "worker" || !latest.isPartial) {
    await finishAgentRun({
      organizationId: run.organizationId,
      executionId: run.executionId,
      errorMessage:
        "Could not resume: the conversation's last message isn't a resumable partial reply.",
    });
    return;
  }
  const precedingUserMessage = await getPrecedingUserMessage(
    run.conversationId,
    latest.createdAt,
  );
  if (!precedingUserMessage) {
    await finishAgentRun({
      organizationId: run.organizationId,
      executionId: run.executionId,
      errorMessage: "Could not resume: no preceding user message found.",
    });
    return;
  }
  const agent = await loadRuntimeAgent(
    run.organizationId,
    run.workerId,
    run.userId,
  );
  if (!agent) {
    await finishAgentRun({
      organizationId: run.organizationId,
      executionId: run.executionId,
      errorMessage:
        "Could not resume: the agent for this run no longer exists.",
    });
    return;
  }

  const stream = await streamMessage(
    {
      organizationId: run.organizationId,
      userId: run.userId,
      agent,
      conversationId: run.conversationId,
      message: buildContinuationPrompt(latest.content),
      appendToMessageId: latest.id,
      continuingRunId: run.id,
    },
    new AbortController().signal,
    precedingUserMessage.id,
  );
  await drain(stream);
}

export async function GET(request: Request) {
  if (!(await isVerifiedCronRequest(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = Date.now();
  let resumed = 0;
  let failed = 0;
  for (;;) {
    if (Date.now() - startedAt > SWEEP_BUDGET_MS) break;
    const [run] = await claimRunsNeedingContinuation(1);
    if (!run) break;
    try {
      await resumeOne(run);
      resumed += 1;
    } catch (error) {
      failed += 1;
      await finishAgentRun({
        organizationId: run.organizationId,
        executionId: run.executionId,
        errorMessage:
          error instanceof Error ? error.message : "Could not resume this run.",
      });
    }
  }

  return Response.json({ resumed, failed });
}
