import "server-only";

import {
  isHtmlDocumentText,
  PilotAiRuntimeError,
  streamReply,
  type CompletedReply,
  type RuntimeEvent,
  type RuntimeRequest,
} from "@/ai/pilot-ai-client";
import { hasActiveCustomConnector } from "@/connectors/connector-definition-repository";
import { attachConversationAttachmentsToMessage } from "@/conversations/attachment-repository";
import { appendConversationMessageContent } from "@/conversations/conversation-message-repository";
import { createConversationMessage } from "@/conversations/conversation-repository";
import {
  failTurn,
  StreamAttemptError,
} from "@/conversations/conversation-turn-failure";
import {
  sanitizeWebResponse,
  saveMessageSources,
} from "@/conversations/message-sources";
import { buildRuntimeRequest } from "@/conversations/runtime-request";
import {
  finishTurnWorkRun,
  owner,
  storedCount,
  type TurnInput,
} from "@/conversations/turn-shared";
import {
  finishExecution,
  startExecution,
} from "@/executions/execution-repository";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { startWorkRun } from "@/work/work-run-repository";

import type { OrganizationCapabilities } from "@/conversations/tool-authorization";

export type { TurnInput } from "@/conversations/turn-shared";

// pilot-ai's own `maxDuration` for /v1/chat/completions is 300s (pilot-ai/vercel.json),
// this Vercel plan's hard ceiling. Stay clearly under that so Pilot never
// races pilot-ai's hard cutoff and tears down a response pilot-ai would
// otherwise have delivered in time.
const STREAM_TIMEOUT_MS = 260_000;
const FALLBACK_MODEL_ID = "kilo/kilo-auto/free";

/**
 * Opens the execution the runtime reports to, then records the user's
 * message. The execution opens first: it is the turn's reservation (see
 * executions_conversation_active_unique), so a retried or duplicated request
 * for a turn already in flight is rejected here, before it can persist
 * another copy of the user's message.
 *
 * A regenerate or continue reuses the existing user message instead of
 * creating a new one — `reuseUserMessageId` skips the insert and carries
 * that id through.
 */
async function beginTurn(input: TurnInput, reuseUserMessageId?: string) {
  const execution = await startExecution({
    organizationId: input.organizationId,
    workerId: input.agent.id,
    conversationId: input.conversationId,
  });
  if (!execution) throw new Error("Pilot could not start this turn.");
  // A durable Work-run record is opened only for the `work` kind — Chat and
  // Code turns never get one, so their behavior is unchanged. See
  // ADR-0025.
  if (input.agent.baseAgentId === "work") {
    await startWorkRun({
      organizationId: input.organizationId,
      workerId: input.agent.id,
      conversationId: input.conversationId,
      executionId: execution.id,
    });
  }
  const userMessage = reuseUserMessageId
    ? { id: reuseUserMessageId }
    : await createConversationMessage(owner(input), {
        conversationId: input.conversationId,
        role: "user",
        content: input.message,
        skillIds: input.activeSkillIds ? [...input.activeSkillIds] : undefined,
        connectorToolIds: input.requestedConnectorToolIds
          ? [...input.requestedConnectorToolIds]
          : undefined,
      });
  if (!userMessage) {
    // The execution already reserved this conversation; leaving it "running"
    // with no message behind it would permanently block every future turn
    // under executions_conversation_active_unique.
    await finishExecution({
      organizationId: input.organizationId,
      executionId: execution.id,
      errorMessage: "This conversation is unavailable.",
    });
    throw new Error("This conversation is unavailable.");
  }
  if (!reuseUserMessageId && input.attachmentIds?.length) {
    await attachConversationAttachmentsToMessage({
      organizationId: input.organizationId,
      userId: input.userId,
      conversationId: input.conversationId,
      messageId: userMessage.id,
      attachmentIds: input.attachmentIds,
    });
  }
  return { userMessage, execution, startedAt: performance.now() };
}

export type Turn = Awaited<ReturnType<typeof beginTurn>>;

async function persistQuestion(
  input: TurnInput,
  turn: Turn,
  event: Extract<RuntimeEvent, { type: "user_input_required" }>,
  modelId: string,
) {
  const message = await createConversationMessage(owner(input), {
    conversationId: input.conversationId,
    role: "worker",
    content: event.question,
    userQuestionOptions: event.options,
    userQuestionSelectionMode: event.selectionMode,
    modelId,
    runtimeRunId: event.runId,
    latencyMs: storedCount(Math.round(performance.now() - turn.startedAt)),
  });
  if (!message) throw new Error("This conversation is unavailable.");
  await finishExecution({
    organizationId: input.organizationId,
    executionId: turn.execution.id,
    conversationMessageId: message.id,
    runtimeRunId: event.runId,
  });
  await finishTurnWorkRun(input, turn);
  return message;
}

async function persistReply(
  input: TurnInput,
  turn: Turn,
  reply: CompletedReply,
  hasWebAccess: boolean,
) {
  const cleaned = hasWebAccess
    ? sanitizeWebResponse(reply.text)
    : { text: reply.text, hasInvalidToolSyntax: false, sources: [] };
  if (
    cleaned.hasInvalidToolSyntax ||
    !cleaned.text ||
    isHtmlDocumentText(cleaned.text)
  ) {
    throw new Error("Pilot returned an invalid response.");
  }
  const message = input.appendToMessageId
    ? await appendConversationMessageContent(
        owner(input),
        input.appendToMessageId,
        ` ${cleaned.text}`,
        false,
      )
    : await createConversationMessage(owner(input), {
        conversationId: input.conversationId,
        role: "worker",
        content: cleaned.text,
        modelId: reply.modelId,
        runtimeRunId: reply.runId ?? undefined,
        latencyMs: storedCount(Math.round(performance.now() - turn.startedAt)),
        inputTokens: storedCount(reply.usage.inputTokens),
        outputTokens: storedCount(reply.usage.outputTokens),
        totalTokens: storedCount(reply.usage.totalTokens),
      });
  if (!message) throw new Error("This conversation is unavailable.");
  await saveMessageSources({
    ...owner(input),
    conversationId: input.conversationId,
    messageId: message.id,
    sources: cleaned.sources,
  });
  await finishExecution({
    organizationId: input.organizationId,
    executionId: turn.execution.id,
    conversationMessageId: message.id,
    runtimeRunId: reply.runId,
  });
  await finishTurnWorkRun(input, turn);
  return { message, text: cleaned.text };
}

/**
 * Runs one attempt of a streaming turn. Returns the terminal event, and the
 * accumulated text for a completion. On any failure (an error or an abort),
 * throws a `StreamAttemptError` carrying whatever text had streamed so far,
 * so a user-initiated stop can keep it instead of losing it — see
 * `conversation-turn-failure.ts`.
 */
async function streamAttempt(
  request: RuntimeRequest,
  signal: AbortSignal,
  onText: (text: string) => void,
) {
  let text = "";
  try {
    for await (const event of streamReply(request, signal)) {
      if (event.type === "text") {
        text += event.text;
        onText(event.text);
        continue;
      }
      return { event, text };
    }
    throw new PilotAiRuntimeError(
      "Pilot couldn't complete this response. Try sending it again.",
      { cause: "Runtime stream ended before a terminal event." },
    );
  } catch (error) {
    throw new StreamAttemptError(text, { cause: error });
  }
}

async function runStreamingTurn(
  input: TurnInput,
  turn: Turn,
  signal: AbortSignal,
  write: (text: string) => void,
) {
  const [policy, customConnectorActive] = await Promise.all([
    getOrganizationPreferences(input.organizationId),
    hasActiveCustomConnector(input.organizationId),
  ]);
  const capabilities: OrganizationCapabilities = {
    ...policy,
    hasActiveCustomConnector: customConnectorActive,
  };
  const models = policy.retryEnabled
    ? [policy.primaryModelId, FALLBACK_MODEL_ID]
    : [policy.primaryModelId];

  for (const [attempt, modelId] of models.entries()) {
    const request = await buildRuntimeRequest(
      input,
      turn.execution.id,
      modelId,
      capabilities,
    );
    const isUsesWeb = request.allowedToolIds.includes("web-search");
    const isLastAttempt = attempt === models.length - 1;
    // An attempt that could still be retried must not leak its text into the
    // response stream: the fallback model's text would land right after it,
    // duplicating content the client already rendered. Only the final
    // possible attempt streams live; an earlier one that succeeds sends its
    // already-complete text in one write instead.
    const canStreamLive = !isUsesWeb && isLastAttempt;
    const result = await streamAttempt(request, signal, (text) => {
      if (canStreamLive) write(text);
    });
    if (result.event.type === "user_input_required") {
      await persistQuestion(input, turn, result.event, request.worker.modelId);
      return;
    }
    try {
      const saved = await persistReply(
        input,
        turn,
        { ...result.event, text: result.text },
        isUsesWeb,
      );
      if (isUsesWeb || !canStreamLive) write(saved.text);
      return;
    } catch (error) {
      if (isLastAttempt) throw error;
    }
  }
}

/**
 * A follow-up message streamed to the browser as plain text. The runtime's
 * terminal event decides what is persisted; the transcript is re-fetched by
 * the browser when the stream closes.
 */
export async function streamMessage(
  input: TurnInput,
  clientSignal: AbortSignal,
  reuseUserMessageId?: string,
): Promise<ReadableStream<Uint8Array>> {
  const turn = await beginTurn(input, reuseUserMessageId);
  const encoder = new TextEncoder();
  const controller = new AbortController();
  const abort = () => {
    controller.abort();
  };
  clientSignal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, STREAM_TIMEOUT_MS);

  return new ReadableStream<Uint8Array>({
    async start(stream) {
      try {
        await runStreamingTurn(input, turn, controller.signal, (text) => {
          stream.enqueue(encoder.encode(text));
        });
        stream.close();
      } catch (error) {
        const partialText =
          error instanceof StreamAttemptError ? error.partialText : "";
        const cause = error instanceof StreamAttemptError ? error.cause : error;
        await failTurn(
          input,
          turn,
          clientSignal.aborted
            ? "Generation cancelled"
            : "Runtime generation failed",
          partialText,
        );
        stream.error(
          cause instanceof PilotAiRuntimeError
            ? cause
            : // The client only ever sees this generic message; keep the
              // real cause on the error so Next's own server-side logging
              // (which prints the `.cause` chain) still shows what actually
              // failed instead of the failure being undebuggable.
              new Error("Pilot could not complete this message.", { cause }),
        );
      } finally {
        clearTimeout(timeout);
        clientSignal.removeEventListener("abort", abort);
      }
    },
    cancel: abort,
  });
}
