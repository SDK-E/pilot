import "server-only";

import { appendConversationMessageContent } from "@/conversations/conversation-message-repository";
import { createConversationMessage } from "@/conversations/conversation-repository";
import {
  finishTurnAgentRun,
  owner,
  storedCount,
  type TurnInput,
} from "@/conversations/turn-shared";
import { didMarkAgentRunNeedsContinuation } from "@/executions/agent-run-repository";
import { finishExecution } from "@/executions/execution-repository";

import type { Turn } from "@/conversations/conversation-turn";

/**
 * Wraps a stream failure (an error or an abort) with whatever text had
 * already streamed, so a user-initiated stop can keep it instead of
 * discarding it — see `failTurn`.
 */
export class StreamAttemptError extends Error {
  constructor(
    readonly partialText: string,
    options: { cause: unknown },
  ) {
    super("Runtime stream attempt failed.", options);
  }
}

interface FailureContext {
  input: TurnInput;
  turn: Turn;
  isCancelled: boolean;
}

async function keepPartialReply(context: FailureContext, partialText: string) {
  const { input, turn } = context;
  const message = input.appendToMessageId
    ? await appendConversationMessageContent(
        owner(input),
        input.appendToMessageId,
        ` ${partialText}`,
        true,
      )
    : await createConversationMessage(owner(input), {
        conversationId: input.conversationId,
        role: "worker",
        content: partialText,
        isPartial: true,
        latencyMs: storedCount(Math.round(performance.now() - turn.startedAt)),
      });
  return message?.id;
}

async function placeholderReply(context: FailureContext) {
  const { input, turn, isCancelled } = context;
  const message = await createConversationMessage(owner(input), {
    conversationId: input.conversationId,
    role: "worker",
    content: isCancelled
      ? "Generation was stopped."
      : "Pilot couldn't complete this response. Try sending it again.",
    isError: !isCancelled,
    latencyMs: storedCount(Math.round(performance.now() - turn.startedAt)),
  });
  return message?.id;
}

/**
 * Records why a turn failed. A worker-role reply is persisted alongside the
 * user's message so a reload shows a clear, styleable failure instead of an
 * orphaned message with no answer. A user-initiated stop that had already
 * streamed real text keeps that text, marked `isPartial`, instead of a
 * placeholder — that's what makes it resumable via "continue".
 */
async function failTurn(
  input: TurnInput,
  turn: Turn,
  reason: "Generation cancelled" | "Runtime generation failed",
  partialText: string,
) {
  const isCancelled = reason === "Generation cancelled";
  const trimmedPartial = partialText.trim();
  const context: FailureContext = { input, turn, isCancelled };

  let messageId: string | undefined;
  if (isCancelled && trimmedPartial) {
    messageId = await keepPartialReply(context, partialText);
  } else if (isCancelled && input.appendToMessageId) {
    // Nothing new streamed before the abort — the message being continued
    // is unchanged and stays resumable exactly as it was.
    messageId = input.appendToMessageId;
  } else {
    messageId = await placeholderReply(context);
  }

  await finishExecution({
    organizationId: input.organizationId,
    executionId: turn.execution.id,
    conversationMessageId: messageId,
    errorMessage: reason,
  });
  await finishTurnAgentRun(input, turn, reason);
}

/**
 * Persists whatever text streamed before an internal-timeout abort as an
 * `isPartial` reply — exactly like a user-initiated stop's `keepPartialReply`
 * — then marks the run `needs_continuation` instead of failing the turn, so
 * `/api/cron/continue-runs` resumes it automatically without the user having
 * to click Continue or even keep the tab open. See ADR-0026. Falls back to
 * `failTurn`'s ordinary failure handling once `MAX_CONTINUATIONS` is
 * exhausted (`didMarkAgentRunNeedsContinuation` returns false).
 */
async function didDeferTurn(
  input: TurnInput,
  turn: Turn,
  partialText: string,
): Promise<boolean> {
  const trimmed = partialText.trim();
  let messageId: string | undefined;
  if (trimmed && input.appendToMessageId) {
    const appended = await appendConversationMessageContent(
      owner(input),
      input.appendToMessageId,
      ` ${partialText}`,
      true,
    );
    messageId = appended?.id;
  } else if (input.appendToMessageId) {
    // Nothing new streamed this chunk — the message being continued is
    // unchanged and stays exactly as resumable as it was.
    messageId = input.appendToMessageId;
  } else {
    const created = await createConversationMessage(owner(input), {
      conversationId: input.conversationId,
      role: "worker",
      content: trimmed,
      isPartial: true,
      latencyMs: storedCount(Math.round(performance.now() - turn.startedAt)),
    });
    messageId = created?.id;
  }

  const wasDeferred = await didMarkAgentRunNeedsContinuation({
    organizationId: input.organizationId,
    executionId: turn.execution.id,
  });
  if (!wasDeferred) {
    await failTurn(input, turn, "Runtime generation failed", partialText);
    return false;
  }
  await finishExecution({
    organizationId: input.organizationId,
    executionId: turn.execution.id,
    conversationMessageId: messageId,
  });
  return true;
}

/**
 * Handles a failed/aborted stream attempt. Returns `isResolved: true` once
 * the turn has been fully resolved as a clean deferral (the caller should
 * just close the stream); otherwise the caller should error the stream with
 * the returned cause.
 */
export async function handleStreamFailure(context: {
  input: TurnInput;
  turn: Turn;
  error: unknown;
  didTimeout: boolean;
  clientSignal: AbortSignal;
}): Promise<{ isResolved: boolean; cause: unknown }> {
  const { input, turn, error, didTimeout, clientSignal } = context;
  const partialText =
    error instanceof StreamAttemptError ? error.partialText : "";
  const cause = error instanceof StreamAttemptError ? error.cause : error;
  if (didTimeout && !clientSignal.aborted) {
    const wasDeferred = await didDeferTurn(input, turn, partialText);
    if (wasDeferred) return { isResolved: true, cause };
  } else {
    await failTurn(
      input,
      turn,
      clientSignal.aborted
        ? "Generation cancelled"
        : "Runtime generation failed",
      partialText,
    );
  }
  return { isResolved: false, cause };
}
