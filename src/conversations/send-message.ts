import "server-only";

import { generateConversationReply } from "@/ai/pilot-ai-client";
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
): ProductionToolId[] {
  return allowedProductionToolIds(worker);
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
    const attachmentContext = await buildAttachmentContext({
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      userId: input.userId,
      maximumCharacters: 20_000 - input.worker.instructions.length - 2,
    });
    reply = await generateConversationReply({
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
  if (
    reply.type !== "completed" ||
    typeof reply.text !== "string" ||
    !reply.usage ||
    typeof reply.modelId !== "string"
  ) {
    return { userMessage, suspended: true };
  }
  const completedReply = reply;
  const latencyMs = toStoredCount(Math.round(performance.now() - startedAt));

  let workerMessage;
  try {
    workerMessage = await createConversationMessage({
      organizationId: input.organizationId,
      workerId: input.worker.id,
      conversationId: input.conversationId,
      createdByWorkosUserId: input.userId,
      role: "worker",
      content: completedReply.text,
      modelId: completedReply.modelId,
      runtimeRunId: completedReply.runId ?? undefined,
      latencyMs,
      inputTokens: toStoredCount(completedReply.usage.inputTokens),
      outputTokens: toStoredCount(completedReply.usage.outputTokens),
      totalTokens: toStoredCount(completedReply.usage.totalTokens),
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
