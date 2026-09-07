import "server-only";

import { generateConversationReply } from "@/ai/pilot-ai-client";
import { createConversationMessage } from "@/conversations/conversation-repository";
import {
  finishExecution,
  startExecution,
} from "@/executions/execution-repository";

type SendConversationMessageInput = {
  organizationId: string;
  worker: { id: string; instructions: string; modelId: "kilo/kilo-auto/free" };
  conversationId: string;
  message: string;
};

function toStoredCount(value: number): number | undefined {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647) {
    return undefined;
  }

  return value;
}

export async function sendConversationMessage(
  input: SendConversationMessageInput,
) {
  const userMessage = await createConversationMessage({
    organizationId: input.organizationId,
    workerId: input.worker.id,
    conversationId: input.conversationId,
    role: "user",
    content: input.message,
  });
  if (!userMessage) {
    throw new Error("Pilot Conversation no longer belongs to this Worker.");
  }

  const startedAt = performance.now();
  const execution = await startExecution({
    organizationId: input.organizationId,
    workerId: input.worker.id,
    conversationId: input.conversationId,
  });
  let reply;
  try {
    reply = await generateConversationReply({
      organizationId: input.organizationId,
      worker: input.worker,
      conversationId: input.conversationId,
      message: input.message,
      allowedToolIds: [],
    });
  } catch (error) {
    if (execution)
      await finishExecution({
        organizationId: input.organizationId,
        executionId: execution.id,
        errorMessage: "Runtime generation failed",
      });
    throw error;
  }
  const latencyMs = toStoredCount(Math.round(performance.now() - startedAt));

  let workerMessage;
  try {
    workerMessage = await createConversationMessage({
      organizationId: input.organizationId,
      workerId: input.worker.id,
      conversationId: input.conversationId,
      role: "worker",
      content: reply.text,
      modelId: reply.modelId,
      runtimeRunId: reply.runId ?? undefined,
      latencyMs,
      inputTokens: toStoredCount(reply.usage.inputTokens),
      outputTokens: toStoredCount(reply.usage.outputTokens),
      totalTokens: toStoredCount(reply.usage.totalTokens),
    });
    if (!workerMessage) {
      throw new Error("Pilot Conversation no longer belongs to this Worker.");
    }
    if (execution)
      await finishExecution({
        organizationId: input.organizationId,
        executionId: execution.id,
        conversationMessageId: workerMessage.id,
        runtimeRunId: reply.runId,
      });
  } catch (error) {
    if (execution)
      await finishExecution({
        organizationId: input.organizationId,
        executionId: execution.id,
        errorMessage: "Response persistence failed",
      });
    throw error;
  }

  return { userMessage, workerMessage };
}
