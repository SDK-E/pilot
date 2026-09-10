import "server-only";

import {
  PilotAiRuntimeError,
  streamConversationReply,
} from "@/ai/pilot-ai-client";
import { createConversationMessage } from "@/conversations/conversation-repository";
import { isResearchAvailable } from "@/conversations/research-availability";
import { buildAttachmentContext } from "@/conversations/attachment-context";
import {
  allowedProductionToolIds,
  type ProductionToolId,
} from "@/conversations/tool-authorization";
import { getProjectMemoryContextForConversation } from "@/projects/project-repository";
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
    approvalRules: Record<string, string>;
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
): ProductionToolId[] {
  return allowedProductionToolIds(worker);
}

async function projectContext(input: StreamConversationMessageInput) {
  const project = await getProjectMemoryContextForConversation({
    organizationId: input.organizationId,
    userId: input.userId,
    conversationId: input.conversationId,
  });
  if (!project) return undefined;
  return {
    id: project.id,
    instructions: project.instructions || undefined,
    sharedMemoryEnabled: project.sharedMemoryEnabled,
  };
}

export async function streamConversationMessage(
  input: StreamConversationMessageInput,
) {
  if (!isResearchAvailable(input.worker.baseAgentId)) {
    throw new Error("Research is not enabled for this environment yet.");
  }
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
        const attachmentContext = await buildAttachmentContext({
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          userId: input.userId,
          maximumCharacters: 20_000 - input.worker.instructions.length - 2,
        });
        for await (const event of streamConversationReply(
          {
            organizationId: input.organizationId,
            worker: {
              ...input.worker,
              instructions: attachmentContext
                ? `${input.worker.instructions}\n\n${attachmentContext}`
                : input.worker.instructions,
            },
            conversationId: input.conversationId,
            message: input.message,
            executionId: execution.id,
            allowedToolIds: allowedToolIds(input.worker),
            project: await projectContext(input),
          },
          abortController.signal,
        )) {
          if (event.type === "text") {
            text += event.text;
            controller.enqueue(encoder.encode(event.text));
            continue;
          }
          if (event.type === "suspended") {
            controller.close();
            return;
          }
          if (event.type === "user_input_required") {
            const workerMessage = await createConversationMessage({
              organizationId: input.organizationId,
              workerId: input.worker.id,
              conversationId: input.conversationId,
              createdByWorkosUserId: input.userId,
              role: "worker",
              content: event.question,
              userQuestionOptions: event.options,
              userQuestionSelectionMode: event.selectionMode,
              modelId: input.worker.modelId,
              runtimeRunId: event.runId,
              latencyMs: toStoredCount(
                Math.round(performance.now() - startedAt),
              ),
              inputTokens: toStoredCount(event.usage.inputTokens),
              outputTokens: toStoredCount(event.usage.outputTokens),
              totalTokens: toStoredCount(event.usage.totalTokens),
            });
            if (!workerMessage) {
              throw new Error(
                "Pilot Conversation no longer belongs to this Worker.",
              );
            }
            await finishExecution({
              organizationId: input.organizationId,
              executionId: execution.id,
              conversationMessageId: workerMessage.id,
              runtimeRunId: event.runId,
            });
            controller.close();
            return;
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
