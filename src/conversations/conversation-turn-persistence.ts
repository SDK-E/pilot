import "server-only";

import {
  isHtmlDocumentText,
  type CompletedReply,
  type RuntimeEvent,
} from "@/ai/pilot-ai-client";
import { appendConversationMessageContent } from "@/conversations/conversation-message-repository";
import { createConversationMessage } from "@/conversations/conversation-repository";
import {
  sanitizeWebResponse,
  saveMessageSources,
} from "@/conversations/message-sources";
import { finishExecution } from "@/executions/execution-repository";
import { recordUsageEvent } from "@/usage/usage-limit-repository";

import { finishTurnAgentRun, owner, storedCount } from "./turn-shared";

import type { Turn } from "./conversation-turn";
import type { TurnInput } from "./turn-shared";

export async function persistQuestion(
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
  await finishTurnAgentRun(input, turn);
  return message;
}

export async function persistReply(
  input: TurnInput,
  turn: Turn,
  reply: CompletedReply,
  attempt: { hasWebAccess: boolean; usageSource: "platform" | "byok" },
) {
  const cleaned = attempt.hasWebAccess
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
  // Only platform-metered usage ever counts against a usage-limit policy
  // (see usage-limit-repository.ts), but both sources are recorded here for
  // the user's own visibility into their usage.
  await recordUsageEvent({
    organizationId: input.organizationId,
    userId: input.userId,
    executionId: turn.execution.id,
    modelId: reply.modelId,
    source: attempt.usageSource,
    inputTokens: reply.usage.inputTokens,
    outputTokens: reply.usage.outputTokens,
  });
  await finishExecution({
    organizationId: input.organizationId,
    executionId: turn.execution.id,
    conversationMessageId: message.id,
    runtimeRunId: reply.runId,
  });
  await finishTurnAgentRun(input, turn);
  return { message, text: cleaned.text };
}
