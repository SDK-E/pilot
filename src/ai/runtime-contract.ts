import { z } from "zod";

import { AGENT_KIND_IDS, TOOL_IDS } from "@/agents/agent-kinds";

/**
 * The wire contract between Pilot and Pilot AI. It mirrors the OpenAI chat
 * completion shape that pilot-ai serves, plus Pilot's own terminal events.
 *
 * ADR-0013 plans to publish these schemas as `@pilot/conversation-contracts`;
 * until then this file mirrors pilot-ai's contract by hand.
 */

const toolIdSchema = z.enum(TOOL_IDS);
export const approvableToolIdSchema = z.enum([
  "web-search",
  "scratchpad",
  "code-sandbox",
]);

export const usageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});

export const approvalRequiredSchema = z.object({
  run_id: z.string().min(1),
  tool_call_id: z.string().min(1),
  tool_id: approvableToolIdSchema,
});

export const userInputRequiredSchema = z.object({
  run_id: z.string().min(1),
  tool_call_id: z.string().min(1),
  question: z.string().trim().min(1).max(1000),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(300).optional(),
      }),
    )
    .min(2)
    .max(8)
    .optional(),
  selection_mode: z.enum(["single_select", "multi_select"]).optional(),
});

export const completionSchema = z.object({
  id: z.string().min(1),
  object: z.literal("chat.completion"),
  model: z.string().min(1).max(200),
  choices: z
    .array(
      z.object({
        message: z.object({
          role: z.literal("assistant"),
          content: z.string().min(1),
        }),
        finish_reason: z.string(),
      }),
    )
    .min(1),
  usage: usageSchema,
});

export const streamChunkSchema = z.object({
  id: z.string().min(1),
  object: z.literal("chat.completion.chunk"),
  model: z.string().min(1).max(200),
  choices: z.array(
    z.object({
      delta: z.object({ content: z.string().optional() }),
      finish_reason: z.string().nullable(),
    }),
  ),
  usage: usageSchema.optional(),
});

/**
 * Streaming terminal events wrap the payload under `pilot`.
 */
export const streamApprovalSchema = z.object({
  object: z.literal("pilot.approval.required"),
  pilot: approvalRequiredSchema,
});
export const streamUserInputSchema = z.object({
  object: z.literal("pilot.user_input.required"),
  pilot: userInputRequiredSchema,
});

export const runtimeRequestSchema = z.object({
  organizationId: z.string().min(1),
  worker: z.object({
    id: z.uuid(),
    instructions: z.string().min(1).max(20_000),
    modelId: z
      .string()
      .regex(/^kilo\/[a-z0-9][a-z0-9._:-]*(?:\/[a-z0-9][a-z0-9._:-]*)*$/i)
      .max(200),
    baseAgentId: z.enum(AGENT_KIND_IDS),
    enabledToolIds: z.array(z.string()).max(20),
    approvalRules: z.record(z.string(), z.string()),
  }),
  conversationId: z.uuid(),
  message: z.string().min(1).max(10_000),
  executionId: z.uuid(),
  allowedToolIds: z.array(toolIdSchema).max(5),
  project: z
    .object({
      id: z.uuid(),
      instructions: z.string().min(1).max(10_000).optional(),
      sharedMemoryEnabled: z.boolean(),
    })
    .optional(),
});

export type RuntimeRequest = z.infer<typeof runtimeRequestSchema>;
export type ApprovableToolId = z.infer<typeof approvableToolIdSchema>;

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type RuntimeEvent =
  | { type: "text"; text: string }
  | {
      type: "suspended";
      runId: string;
      toolCallId: string;
      toolId: ApprovableToolId;
    }
  | {
      type: "user_input_required";
      runId: string;
      toolCallId: string;
      question: string;
      options?: { label: string; description?: string }[];
      selectionMode?: "single_select" | "multi_select";
    }
  | {
      type: "completed";
      modelId: string;
      runId: string | null;
      finishReason: string;
      usage: Usage;
    };

export type CompletedReply = Extract<RuntimeEvent, { type: "completed" }> & {
  text: string;
};

export class PilotAiRuntimeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PilotAiRuntimeError";
  }
}

export function usageOf(usage: z.infer<typeof usageSchema>): Usage {
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}

export function runIdOf(id: string): string | null {
  return id.replace(/^chatcmpl_/, "") || null;
}

export function toSuspended(
  data: z.infer<typeof approvalRequiredSchema>,
): RuntimeEvent {
  return {
    type: "suspended",
    runId: data.run_id,
    toolCallId: data.tool_call_id,
    toolId: data.tool_id,
  };
}

export function toUserInput(
  data: z.infer<typeof userInputRequiredSchema>,
): RuntimeEvent {
  return {
    type: "user_input_required",
    runId: data.run_id,
    toolCallId: data.tool_call_id,
    question: data.question,
    options: data.options,
    selectionMode: data.selection_mode,
  };
}

export function toCompleted(
  completion: z.infer<typeof completionSchema>,
): CompletedReply {
  const [choice] = completion.choices;
  if (!choice) throw new Error("The runtime returned a reply with no choices.");
  return {
    type: "completed",
    text: choice.message.content,
    finishReason: choice.finish_reason,
    modelId: completion.model,
    runId: runIdOf(completion.id),
    usage: usageOf(completion.usage),
  };
}
