import "server-only";

import { appendConversationMessageContent } from "@/conversations/conversation-message-repository";
import { createConversationMessage } from "@/conversations/conversation-repository";
import {
  owner,
  storedCount,
  type TurnInput,
} from "@/conversations/turn-shared";
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
export async function failTurn(
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
}
