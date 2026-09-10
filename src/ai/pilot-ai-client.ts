import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";
import { z } from "zod";

const approvalRequiredResponseSchema = z.object({
  object: z.literal("pilot.approval.required"),
  run_id: z.string().min(1),
  tool_call_id: z.string().min(1),
  tool_id: z.enum(["web-search", "scratchpad"]),
});

const productionToolIdSchema = z.enum(["web-search", "scratchpad"]);

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

const runtimeStreamChunkSchema = z.object({
  id: z.string().min(1),
  object: z.literal("chat.completion.chunk"),
  model: z.literal("kilo/kilo-auto/free"),
  choices: z.array(
    z.object({
      delta: z.object({ content: z.string().optional() }),
      finish_reason: z.string().nullable(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative(),
      completion_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
    })
    .optional(),
});

const generateConversationRequestSchema = z.object({
  organizationId: z.string().min(1),
  worker: z.object({
    id: z.uuid(),
    instructions: z.string().min(1).max(20_000),
    modelId: z.literal("kilo/kilo-auto/free"),
    baseAgentId: z.enum(["conversational", "research"]),
    enabledToolIds: z.array(z.string()).max(20),
    approvalRules: z.record(z.string(), z.string()),
  }),
  conversationId: z.uuid(),
  message: z.string().min(1).max(10_000),
  executionId: z.uuid(),
  allowedToolIds: z.array(productionToolIdSchema).max(2),
  project: z
    .object({
      id: z.uuid(),
      instructions: z.string().min(1).max(10_000).optional(),
      sharedMemoryEnabled: z.boolean(),
    })
    .optional(),
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

export type PilotAiStreamEvent =
  | { type: "text"; text: string }
  | {
      type: "suspended";
      runId: string;
      toolCallId: string;
      toolId: z.infer<typeof productionToolIdSchema>;
    }
  | {
      type: "completed";
      modelId: "kilo/kilo-auto/free";
      runId: string | null;
      finishReason: string;
      usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
      };
    };

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

function toolApprovalMode(request: GenerateConversationRequest) {
  if (!request.allowedToolIds.length) return undefined;
  return request.allowedToolIds.some(
    (toolId) => request.worker.approvalRules[toolId] === "ask",
  )
    ? "ask"
    : "allow";
}

function headersForRuntime(
  request: GenerateConversationRequest,
  oidcToken: string,
) {
  return {
    "content-type": "application/json",
    "x-pilot-runtime-oidc-token": oidcToken,
    "x-vercel-trusted-oidc-idp-token": oidcToken,
    "x-pilot-organization-id": request.organizationId,
    "x-pilot-worker-id": request.worker.id,
    "x-pilot-conversation-id": request.conversationId,
    "x-pilot-execution-id": request.executionId,
    "x-pilot-base-agent-id": request.worker.baseAgentId,
    "x-pilot-allowed-tool-ids": JSON.stringify(request.allowedToolIds),
    ...(toolApprovalMode(request)
      ? {
          "x-pilot-tool-approval-mode": toolApprovalMode(request),
        }
      : {}),
    ...(request.project
      ? {
          "x-pilot-project-id": request.project.id,
          "x-pilot-project-instructions": request.project.instructions ?? "",
          "x-pilot-project-shared-memory-enabled": String(
            request.project.sharedMemoryEnabled,
          ),
        }
      : {}),
  };
}

export async function generateConversationReply(
  rawRequest: GenerateConversationRequest,
) {
  const request = generateConversationRequestSchema.parse(rawRequest);
  const url = new URL("/v1/chat/completions", getRuntimeUrl());
  const oidcToken = await getVercelOidcToken();
  const response = await fetch(url, {
    method: "POST",
    headers: headersForRuntime(request, oidcToken),
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

  const payload: unknown = await response.json();
  const approval = approvalRequiredResponseSchema.safeParse(payload);
  if (approval.success)
    return {
      type: "suspended",
      runId: approval.data.run_id,
      toolCallId: approval.data.tool_call_id,
      toolId: approval.data.tool_id,
    };
  const completion = runtimeResponseSchema.parse(payload);
  const choice = completion.choices[0];
  return {
    type: "completed",
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

export async function* streamConversationReply(
  rawRequest: GenerateConversationRequest,
  signal?: AbortSignal,
): AsyncGenerator<PilotAiStreamEvent> {
  const request = generateConversationRequestSchema.parse(rawRequest);
  const url = new URL("/v1/chat/completions", getRuntimeUrl());
  const oidcToken = await getVercelOidcToken();
  const response = await fetch(url, {
    method: "POST",
    headers: headersForRuntime(request, oidcToken),
    body: JSON.stringify({
      model: request.worker.modelId,
      messages: [
        { role: "system", content: request.worker.instructions },
        { role: "user", content: request.message },
      ],
      stream: true,
      stream_options: { include_usage: true },
    }),
    cache: "no-store",
    signal,
  });
  if (!response.ok || !response.body) {
    throw new PilotAiRuntimeError(
      `Pilot Conversation runtime returned ${response.status}.`,
    );
  }

  yield* parseConversationRuntimeStream(response.body);
}

export async function* parseConversationRuntimeStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<PilotAiStreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";
  let finalEvent:
    Extract<PilotAiStreamEvent, { type: "completed" }> | undefined;
  let suspensionEvent:
    Extract<PilotAiStreamEvent, { type: "suspended" }> | undefined;

  const handleEvent = (event: string): PilotAiStreamEvent | undefined => {
    const data = event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return undefined;

    const rawChunk: unknown = JSON.parse(data);
    const suspension = z
      .object({
        object: z.literal("pilot.approval.required"),
        pilot: z.object({
          run_id: z.string().min(1),
          tool_call_id: z.string().min(1),
          tool_id: productionToolIdSchema,
        }),
      })
      .safeParse(rawChunk);
    if (suspension.success) {
      return {
        type: "suspended",
        runId: suspension.data.pilot.run_id,
        toolCallId: suspension.data.pilot.tool_call_id,
        toolId: suspension.data.pilot.tool_id,
      };
    }
    const chunk = runtimeStreamChunkSchema.parse(rawChunk);
    const text = chunk.choices[0]?.delta.content;
    if (text) return { type: "text", text };
    if (!chunk.usage) return undefined;

    const finishReason = chunk.choices[0]?.finish_reason ?? "stop";
    return {
      type: "completed",
      modelId: chunk.model,
      runId: chunk.id.replace(/^chatcmpl_/, "") || null,
      finishReason,
      usage: {
        inputTokens: chunk.usage.prompt_tokens,
        outputTokens: chunk.usage.completion_tokens,
        totalTokens: chunk.usage.total_tokens,
      },
    };
  };

  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const parsed = handleEvent(event);
        if (!parsed) continue;
        if (parsed.type === "completed") finalEvent = parsed;
        else if (parsed.type === "suspended") suspensionEvent = parsed;
        else yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }

  buffer += decoder.decode();
  if (buffer) {
    const parsed = handleEvent(buffer);
    if (parsed?.type === "completed") finalEvent = parsed;
    else if (parsed?.type === "suspended") suspensionEvent = parsed;
    else if (parsed) yield parsed;
  }
  if (suspensionEvent) {
    yield suspensionEvent;
    return;
  }
  if (!finalEvent) {
    throw new PilotAiRuntimeError(
      "Pilot Conversation ended before completing the response.",
    );
  }
  yield finalEvent;
}

export async function resumeResearchApproval(
  input: GenerateConversationRequest & {
    runtimeRunId: string;
    toolCallId: string;
    toolId: z.infer<typeof productionToolIdSchema>;
    approved: boolean;
  },
) {
  const request = generateConversationRequestSchema
    .extend({
      runtimeRunId: z.string().min(1),
      toolCallId: z.string().min(1),
      toolId: productionToolIdSchema,
      approved: z.boolean(),
    })
    .parse(input);
  const oidcToken = await getVercelOidcToken();
  const response = await fetch(
    new URL("/v1/approvals/resume", getRuntimeUrl()),
    {
      method: "POST",
      headers: headersForRuntime(request, oidcToken),
      body: JSON.stringify({ ...request }),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new PilotAiRuntimeError(
      `Pilot approval runtime returned ${response.status}.`,
    );
  const completion = runtimeResponseSchema.parse(await response.json());
  const choice = completion.choices[0];
  return {
    text: choice.message.content,
    modelId: completion.model,
    runId: completion.id.replace(/^chatcmpl_/, "") || null,
    usage: {
      inputTokens: completion.usage.prompt_tokens,
      outputTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
    },
  };
}

export async function deleteConversationMemory(input: {
  organizationId: string;
  workerId: string;
  conversationId: string;
  project?: { id: string; sharedMemoryEnabled: boolean };
}) {
  const url = new URL("/v1/conversations/delete", getRuntimeUrl());
  const oidcToken = await getVercelOidcToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pilot-runtime-oidc-token": oidcToken,
      "x-vercel-trusted-oidc-idp-token": oidcToken,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new PilotAiRuntimeError(
      `Pilot Conversation cleanup returned ${response.status}.`,
    );
  }
}

export async function deleteProjectMemory(input: {
  organizationId: string;
  workerId: string;
  projectId: string;
}) {
  const url = new URL("/v1/projects/delete-memory", getRuntimeUrl());
  const oidcToken = await getVercelOidcToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pilot-runtime-oidc-token": oidcToken,
      "x-vercel-trusted-oidc-idp-token": oidcToken,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new PilotAiRuntimeError(
      `Pilot Project cleanup returned ${response.status}.`,
    );
  }
}
