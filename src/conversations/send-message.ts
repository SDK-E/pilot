import "server-only";

import { generateConversationReply } from "@/ai/pilot-ai-client";
import { createConversationMessage } from "@/conversations/conversation-repository";

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
  const startedAt = performance.now();
  const reply = await generateConversationReply({
    organizationId: input.organizationId,
    worker: input.worker,
    conversationId: input.conversationId,
    message: input.message,
    allowedToolIds: [],
  });
  const latencyMs = toStoredCount(Math.round(performance.now() - startedAt));

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

  const workerMessage = await createConversationMessage({
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

  return { userMessage, workerMessage };
}
