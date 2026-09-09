import "server-only";

import { generateConversationReply } from "@/ai/pilot-ai-client";
import { createConversationMessage } from "@/conversations/conversation-repository";
import { isResearchAvailable } from "@/conversations/research-availability";
import { canUseResearchWebSearch } from "@/conversations/research-tool-authorization";
import { getProjectMemoryContextForConversation } from "@/projects/project-repository";
import {
  finishExecution,
  startExecution,
} from "@/executions/execution-repository";

type SendConversationMessageInput = {
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
};

function toStoredCount(value: number): number | undefined {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647) {
    return undefined;
  }

  return value;
}

function allowedToolIds(
  worker: SendConversationMessageInput["worker"],
): Array<"web-search"> {
  return canUseResearchWebSearch(worker) ? ["web-search"] : [];
}

async function projectContext(input: SendConversationMessageInput) {
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

export async function sendConversationMessage(
  input: SendConversationMessageInput,
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

  const startedAt = performance.now();
  const execution = await startExecution({
    organizationId: input.organizationId,
    workerId: input.worker.id,
    conversationId: input.conversationId,
  });
  if (!execution) throw new Error("Pilot could not start this execution.");
  let reply;
  try {
    reply = await generateConversationReply({
      organizationId: input.organizationId,
      worker: input.worker,
      conversationId: input.conversationId,
      message: input.message,
      executionId: execution.id,
      allowedToolIds: allowedToolIds(input.worker),
      project: await projectContext(input),
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
      createdByWorkosUserId: input.userId,
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
