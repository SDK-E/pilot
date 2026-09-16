import "server-only";

import {
  isHtmlDocumentText,
  PilotAiRuntimeError,
  streamReply,
  type CompletedReply,
  type RuntimeEvent,
  type RuntimeRequest,
} from "@/ai/pilot-ai-client";
import { getAvailableConnectorProviders } from "@/connectors/connector-repository";
import { buildAttachmentContext } from "@/conversations/attachment-context";
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
import {
  allowedToolIds,
  type OrganizationCapabilities,
} from "@/conversations/tool-authorization";
import {
  owner,
  storedCount,
  type TurnInput,
} from "@/conversations/turn-shared";
import {
  finishExecution,
  startExecution,
} from "@/executions/execution-repository";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { getProjectMemoryContextForConversation } from "@/projects/project-repository";

export type { TurnInput } from "@/conversations/turn-shared";

const MAX_INSTRUCTIONS_LENGTH = 20_000;
// pilot-ai's own `maxDuration` for /v1/chat/completions is 90s (pilot-ai/vercel.json).
// Stay clearly under that so Pilot never races pilot-ai's hard cutoff and tears
// down a response pilot-ai would otherwise have delivered in time.
const STREAM_TIMEOUT_MS = 75_000;
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
  const userMessage = reuseUserMessageId
    ? { id: reuseUserMessageId }
    : await createConversationMessage(owner(input), {
        conversationId: input.conversationId,
        role: "user",
        content: input.message,
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
  return { userMessage, execution, startedAt: performance.now() };
}

async function runtimeRequest(
  input: TurnInput,
  executionId: string,
  modelId: string,
  capabilities: OrganizationCapabilities,
): Promise<RuntimeRequest> {
  const scope = {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    userId: input.userId,
  };
  const [attachmentContext, project] = await Promise.all([
    buildAttachmentContext({
      ...scope,
      maximumCharacters:
        MAX_INSTRUCTIONS_LENGTH - input.agent.instructions.length - 2,
    }),
    getProjectMemoryContextForConversation(scope),
  ]);
  return {
    organizationId: input.organizationId,
    worker: {
      ...input.agent,
      modelId,
      instructions: attachmentContext
        ? `${input.agent.instructions}\n\n${attachmentContext}`
        : input.agent.instructions,
    },
    conversationId: input.conversationId,
    message: input.message,
    executionId,
    allowedToolIds: allowedToolIds(input.agent, capabilities),
    project: project && {
      id: project.id,
      instructions: project.instructions ?? undefined,
      sharedMemoryEnabled: project.sharedMemoryEnabled,
    },
  };
}

export type Turn = Awaited<ReturnType<typeof beginTurn>>;

async function persistQuestion(
  input: TurnInput,
  turn: Turn,
  event: Extract<RuntimeEvent, { type: "user_input_required" }>,
) {
  const message = await createConversationMessage(owner(input), {
    conversationId: input.conversationId,
    role: "worker",
    content: event.question,
    userQuestionOptions: event.options,
    userQuestionSelectionMode: event.selectionMode,
    modelId: input.agent.modelId,
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
  const [policy, availableConnectorProviders] = await Promise.all([
    getOrganizationPreferences(input.organizationId),
    getAvailableConnectorProviders({
      organizationId: input.organizationId,
      userId: input.userId,
    }),
  ]);
  const capabilities: OrganizationCapabilities = {
    ...policy,
    availableConnectorProviders,
  };
  const models = policy.retryEnabled
    ? [policy.primaryModelId, FALLBACK_MODEL_ID]
    : [policy.primaryModelId];

  for (const [attempt, modelId] of models.entries()) {
    const request = await runtimeRequest(
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
      await persistQuestion(input, turn, result.event);
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
            : new Error("Pilot could not complete this message."),
        );
      } finally {
        clearTimeout(timeout);
        clientSignal.removeEventListener("abort", abort);
      }
    },
    cancel: abort,
  });
}
