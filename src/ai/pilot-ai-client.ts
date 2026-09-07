import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";
import { z } from "zod";

const runtimeResponseSchema = z.object({
  id: z.string().min(1),
  object: z.literal("chat.completion"),
  model: z.literal("kilo/kilo-auto/free"),
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
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative(),
    completion_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative(),
  }),
});

const generateConversationRequestSchema = z.object({
  organizationId: z.string().min(1),
  worker: z.object({
    id: z.uuid(),
    instructions: z.string().min(1).max(20_000),
    modelId: z.literal("kilo/kilo-auto/free"),
  }),
  conversationId: z.uuid(),
  message: z.string().min(1).max(10_000),
  allowedToolIds: z.array(z.string()).max(0),
});

export type GenerateConversationRequest = z.infer<
  typeof generateConversationRequestSchema
>;

export class PilotAiRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PilotAiRuntimeError";
  }
}

function getRuntimeUrl(): URL {
  const value = process.env.PILOT_AI_RUNTIME_URL?.trim();
  if (!value) {
    throw new PilotAiRuntimeError(
      "Pilot Conversation is not configured for this environment.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PilotAiRuntimeError("PILOT_AI_RUNTIME_URL must be a valid URL.");
  }

  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new PilotAiRuntimeError(
      "Pilot Conversation requires an HTTPS runtime URL in production.",
    );
  }

  return url;
}

export async function generateConversationReply(
  rawRequest: GenerateConversationRequest,
) {
  const request = generateConversationRequestSchema.parse(rawRequest);
  const url = new URL("/v1/chat/completions", getRuntimeUrl());
  const oidcToken = await getVercelOidcToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vercel-trusted-oidc-idp-token": oidcToken,
      "x-pilot-organization-id": request.organizationId,
      "x-pilot-worker-id": request.worker.id,
      "x-pilot-conversation-id": request.conversationId,
    },
    body: JSON.stringify({
      model: request.worker.modelId,
      messages: [
        { role: "system", content: request.worker.instructions },
        { role: "user", content: request.message },
      ],
      stream: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PilotAiRuntimeError(
      `Pilot Conversation runtime returned ${response.status}.`,
    );
  }

  const completion = runtimeResponseSchema.parse(await response.json());
  const choice = completion.choices[0];

  return {
    text: choice.message.content,
    finishReason: choice.finish_reason,
    modelId: completion.model,
    runId: completion.id.replace(/^chatcmpl_/, "") || null,
    usage: {
      inputTokens: completion.usage.prompt_tokens,
      outputTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
    },
  };
}
