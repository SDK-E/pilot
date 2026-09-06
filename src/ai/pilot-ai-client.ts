import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";
import { z } from "zod";

const runtimeResponseSchema = z.object({
  text: z.string().min(1),
  finishReason: z.string(),
  modelId: z.string().min(1),
  runId: z.string().min(1).nullable().optional(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
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
  const url = new URL("/pilot/conversations/generate", getRuntimeUrl());
  const oidcToken = await getVercelOidcToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vercel-trusted-oidc-idp-token": oidcToken,
    },
    body: JSON.stringify(request),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PilotAiRuntimeError(
      `Pilot Conversation runtime returned ${response.status}.`,
    );
  }

  return runtimeResponseSchema.parse(await response.json());
}
