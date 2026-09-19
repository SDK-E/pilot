import "server-only";

import {
  PilotAiRuntimeError,
  streamReply,
  type RuntimeRequest,
} from "@/ai/pilot-ai-client";
import { hasActiveCustomConnector } from "@/connectors/connector-definition-repository";
import { attachConversationAttachmentsToMessage } from "@/conversations/attachment-repository";
import { createConversationMessage } from "@/conversations/conversation-repository";
import {
  handleStreamFailure,
  StreamAttemptError,
} from "@/conversations/conversation-turn-failure";
import {
  persistQuestion,
  persistReply,
} from "@/conversations/conversation-turn-persistence";
import { resolveModelPlan } from "@/conversations/model-plan";
import { buildRuntimeRequest } from "@/conversations/runtime-request";
import { encodeStreamEvent } from "@/conversations/stream-protocol";
import { owner, type TurnInput } from "@/conversations/turn-shared";
import { startAgentRun } from "@/executions/agent-run-repository";
import {
  finishExecution,
  startExecution,
} from "@/executions/execution-repository";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { resolveUsageFallbackModelId } from "@/usage/usage-limit-repository";

import type { OrganizationCapabilities } from "@/conversations/tool-authorization";

export type { TurnInput } from "@/conversations/turn-shared";

// This route's own `maxDuration` is 300s (this Vercel plan's hard ceiling —
// see the stream route). Stay clearly under it so Pilot's own timeout fires
// first and can hand off to ADR-0026's chunked continuation, rather than
// Vercel tearing the request down mid-response with no recovery.
const STREAM_TIMEOUT_MS = 260_000;

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
    requestedConnectorSlugs: input.requestedConnectorSlugs,
  });
  if (!execution) throw new Error("Pilot could not start this turn.");
  // Every agent kind gets a durable run record now — see ADR-0025/ADR-0026.
  await startAgentRun({
    organizationId: input.organizationId,
    workerId: input.agent.id,
    conversationId: input.conversationId,
    executionId: execution.id,
    kind: input.agent.baseAgentId,
    continuingRunId: input.continuingRunId,
  });
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
  const [policy, customConnectorActive, usageFallbackModelId] =
    await Promise.all([
      getOrganizationPreferences(input.organizationId),
      hasActiveCustomConnector(input.organizationId, input.userId),
      // Only relevant once there is no explicit per-message pick — skip the
      // usage-window read entirely otherwise.
      input.requestedModelId
        ? undefined
        : resolveUsageFallbackModelId(input.organizationId, input.userId),
    ]);
  const capabilities: OrganizationCapabilities = {
    ...policy,
    hasActiveCustomConnector: customConnectorActive,
  };
  const models = resolveModelPlan({
    policy,
    requestedModelId: input.requestedModelId,
    usageFallbackModelId,
  });

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
        {
          hasWebAccess: isUsesWeb,
          usageSource: modelId.startsWith("byok:") ? "byok" : "platform",
        },
      );
      if (isUsesWeb || !canStreamLive) write(saved.text);
      return;
    } catch (error) {
      if (isLastAttempt) throw error;
    }
  }
}

/**
 * A follow-up message streamed to the browser as real `text/event-stream`
 * framing (see `stream-protocol.ts`, ADR-0029) — never plain, structure-less
 * text. The runtime's terminal event decides what is persisted; the
 * transcript is re-fetched by the browser when the stream closes.
 */
export async function streamMessage(
  input: TurnInput,
  clientSignal: AbortSignal,
  reuseUserMessageId?: string,
): Promise<ReadableStream<Uint8Array>> {
  const turn = await beginTurn(input, reuseUserMessageId);
  const controller = new AbortController();
  let didTimeout = false;
  const abort = () => {
    controller.abort();
  };
  clientSignal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => {
    didTimeout = true;
    abort();
  }, STREAM_TIMEOUT_MS);

  return new ReadableStream<Uint8Array>({
    async start(stream) {
      try {
        await runStreamingTurn(input, turn, controller.signal, (text) => {
          stream.enqueue(encodeStreamEvent({ type: "text", text }));
        });
        stream.close();
      } catch (error) {
        const { isResolved, cause } = await handleStreamFailure({
          input,
          turn,
          error,
          didTimeout,
          clientSignal,
        });
        if (isResolved) {
          stream.close();
          return;
        }
        // A graceful error frame, not `stream.error()` — the latter resets
        // the HTTP connection outright, losing the message the client would
        // otherwise show. Next's own server-side logging still gets the
        // real cause via console.error in handleStreamFailure.
        const message =
          cause instanceof PilotAiRuntimeError
            ? cause.message
            : "Pilot could not complete this message.";
        stream.enqueue(encodeStreamEvent({ type: "error", message }));
        stream.close();
      } finally {
        clearTimeout(timeout);
        clientSignal.removeEventListener("abort", abort);
      }
    },
    cancel: abort,
  });
}
