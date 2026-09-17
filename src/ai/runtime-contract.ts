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

export const usageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
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
export const streamUserInputSchema = z.object({
  object: z.literal("pilot.user_input.required"),
  pilot: userInputRequiredSchema,
});

export const runtimeRequestSchema = z.object({
  organizationId: z.string().min(1),
  worker: z.object({
    id: z.uuid(),
    instructions: z.string().min(1).max(20_000),
    // A Mastra model-router id: "<provider>/<model>", e.g.
    // "kilo/kilo-auto/free", "vercel/openai/gpt-4o", or "openai/gpt-4o-mini"
    // for a custom OpenAI-compatible gateway. Not tied to one provider —
    // see `model-gateways/model-gateway-repository.ts` for how an
    // organization's chosen model resolves into this plus the credential
    // fields below.
    modelId: z
      .string()
      .regex(/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:/-]*$/i)
      .max(200),
    // The gateway credential to call `modelId` with, resolved server-side
    // from an admin-configured `model_gateways` row — never a secret this
    // repo stores long-term. Omitted for a request pilot-ai must still
    // resolve from its own environment (legacy/no gateway configured yet).
    gatewayApiKey: z.string().min(1).max(2000).optional(),
    // Only set for an "openai-compatible" gateway; kilo/vercel-ai-gateway
    // resolve their URL from Mastra's own built-in provider registry.
    gatewayBaseUrl: z.url().max(500).optional(),
    baseAgentId: z.enum(AGENT_KIND_IDS),
    enabledToolIds: z.array(z.string()).max(20),
  }),
  conversationId: z.uuid(),
  message: z.string().min(1).max(10_000),
  executionId: z.uuid(),
  // Mirrors worker.enabledToolIds' cap below; pilot-ai's own copy of this
  // contract must be raised in step, since this file only mirrors it by
  // hand (see the file-level doc comment).
  allowedToolIds: z.array(toolIdSchema).max(20),
  project: z
    .object({
      id: z.uuid(),
      instructions: z.string().min(1).max(10_000).optional(),
      sharedMemoryEnabled: z.boolean(),
    })
    .optional(),
});

export type RuntimeRequest = z.infer<typeof runtimeRequestSchema>;

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type RuntimeEvent =
  | { type: "text"; text: string }
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

// Catches a provider outage returning an HTTP error page as a 200 "success".
const HTML_DOCUMENT_PATTERN = /^\s*<(!doctype\s+html|html[\s>])/i;

export function isHtmlDocumentText(text: string): boolean {
  return HTML_DOCUMENT_PATTERN.test(text);
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
