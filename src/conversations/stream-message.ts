import "server-only";

import {
  PilotAiRuntimeError,
  streamConversationReply,
} from "@/ai/pilot-ai-client";
import { createConversationMessage } from "@/conversations/conversation-repository";
import {
  finishExecution,
  startExecution,
} from "@/executions/execution-repository";

type StreamConversationMessageInput = {
  organizationId: string;
  worker: {
    id: string;
    instructions: string;
    modelId: "kilo/kilo-auto/free";
    baseAgentId: "conversational" | "research";
    enabledToolIds: string[];
  };
  conversationId: string;
  userId: string;
  message: string;
  signal: AbortSignal;
};

function toStoredCount(value: number): number | undefined {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647) {
    return undefined;
  }
  return value;
}

function allowedToolIds(
  worker: StreamConversationMessageInput["worker"],
): Array<"web-search"> {
  return worker.baseAgentId === "research" &&
    worker.enabledToolIds.includes("web-search")
    ? ["web-search"]
    : [];
}

export async function streamConversationMessage(
  input: StreamConversationMessageInput,
) {
  const userMessage = await createConversationMessage({
    organizationId: input.organizationId,
    workerId: input.worker.id,
    conversationId: input.conversationId,
    createdByWorkosUserId: input.userId,
    role: "user",
    content: input.message,
  });
  if (!userMessage) {
    throw new Error("Pilot Conversation no longer belongs to this Worker.");
  }

  const execution = await startExecution({
    organizationId: input.organizationId,
    workerId: input.worker.id,
    conversationId: input.conversationId,
  });
  if (!execution) throw new Error("Pilot could not start this execution.");
  const encoder = new TextEncoder();
  const startedAt = performance.now();
  const abortController = new AbortController();
  const abort = () => abortController.abort();
  input.signal.addEventListener("abort", abort, { once: true });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      try {
        for await (const event of streamConversationReply(
          {
            organizationId: input.organizationId,
            worker: input.worker,
            conversationId: input.conversationId,
            message: input.message,
            executionId: execution.id,
            allowedToolIds: allowedToolIds(input.worker),
          },
          abortController.signal,
        )) {
          if (event.type === "text") {
            text += event.text;
            controller.enqueue(encoder.encode(event.text));
            continue;
          }

          const workerMessage = await createConversationMessage({
            organizationId: input.organizationId,
            workerId: input.worker.id,
            conversationId: input.conversationId,
            createdByWorkosUserId: input.userId,
            role: "worker",
            content: text,
            modelId: event.modelId,
            runtimeRunId: event.runId ?? undefined,
            latencyMs: toStoredCount(Math.round(performance.now() - startedAt)),
            inputTokens: toStoredCount(event.usage.inputTokens),
            outputTokens: toStoredCount(event.usage.outputTokens),
            totalTokens: toStoredCount(event.usage.totalTokens),
          });
          if (!workerMessage) {
            throw new Error(
              "Pilot Conversation no longer belongs to this Worker.",
            );
          }
          if (execution) {
            await finishExecution({
              organizationId: input.organizationId,
              executionId: execution.id,
              conversationMessageId: workerMessage.id,
              runtimeRunId: event.runId,
            });
          }
        }
        controller.close();
      } catch (error) {
        if (execution) {
          await finishExecution({
            organizationId: input.organizationId,
            executionId: execution.id,
            errorMessage: input.signal.aborted
              ? "Generation cancelled"
              : "Runtime generation failed",
          });
        }
        controller.error(
          error instanceof PilotAiRuntimeError
            ? error
            : new Error("Pilot could not complete this message."),
        );
      } finally {
        input.signal.removeEventListener("abort", abort);
      }
    },
    cancel() {
      abortController.abort();
    },
  });
}
