import "server-only";

import {
  PilotAiRuntimeError,
  runtimeRequestSchema,
  type RuntimeEvent,
  type RuntimeRequest,
} from "./runtime-contract";
import { parseRuntimeStream } from "./runtime-stream";
import { getPilotRuntimeToken } from "./workos-m2m";

export {
  isHtmlDocumentText,
  PilotAiRuntimeError,
  type CompletedReply,
  type RuntimeEvent,
  type RuntimeRequest,
} from "./runtime-contract";

/**
 * Server-only HTTP client for Pilot AI. Every call carries a WorkOS M2M
 * token, so the runtime can verify that Pilot, and not a browser, is calling.
 */

function runtimeUrl(path: string): URL {
  const value = process.env.PILOT_AI_RUNTIME_URL?.trim();
  if (!value) {
    throw new PilotAiRuntimeError(
      "Pilot couldn't complete this response. Try sending it again.",
      { cause: "PILOT_AI_RUNTIME_URL is not configured." },
    );
  }
  const base = new URL(value);
  if (base.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new PilotAiRuntimeError(
      "Pilot couldn't complete this response. Try sending it again.",
      { cause: "PILOT_AI_RUNTIME_URL must be HTTPS in production." },
    );
  }
  return new URL(path, base);
}

async function runtimeHeaders(request: RuntimeRequest) {
  const runtimeToken = await getPilotRuntimeToken();
  return {
    "content-type": "application/json",
    "x-pilot-runtime-token": runtimeToken,
    "x-pilot-organization-id": request.organizationId,
    "x-pilot-worker-id": request.worker.id,
    "x-pilot-conversation-id": request.conversationId,
    "x-pilot-execution-id": request.executionId,
    "x-pilot-base-agent-id": request.worker.baseAgentId,
    "x-pilot-allowed-tool-ids": JSON.stringify(request.allowedToolIds),
    ...(request.worker.gatewayApiKey && {
      "x-pilot-model-gateway-api-key": request.worker.gatewayApiKey,
    }),
    ...(request.worker.gatewayBaseUrl && {
      "x-pilot-model-gateway-base-url": request.worker.gatewayBaseUrl,
    }),
    ...(request.project && {
      "x-pilot-project-id": request.project.id,
      "x-pilot-project-instructions": request.project.instructions ?? "",
      "x-pilot-project-shared-memory-enabled": String(
        request.project.sharedMemoryEnabled,
      ),
    }),
  };
}

function chatCompletionBody(request: RuntimeRequest, isStreaming: boolean) {
  return JSON.stringify({
    model: request.worker.modelId,
    messages: [
      { role: "system", content: request.worker.instructions },
      { role: "user", content: request.message },
    ],
    stream: isStreaming,
    ...(isStreaming && { stream_options: { include_usage: true } }),
  });
}

async function postToRuntime(
  path: string,
  request: RuntimeRequest,
  body: string,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(runtimeUrl(path), {
    method: "POST",
    headers: await runtimeHeaders(request),
    body,
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    // The runtime's error body often carries the actual rejection reason
    // (see pilot-ai's verifyPilotRuntimeRequestDiag), which is otherwise
    // silently discarded here. It goes in `cause` for server-side logging
    // only: this error's message reaches the chat client as-is
    // (conversation-turn.ts streams it through), so it must stay generic —
    // no internal service name, no raw HTTP status code.
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // Fall through with no detail; the response is still reported below.
    }
    throw new PilotAiRuntimeError(
      "Pilot couldn't complete this response. Try sending it again.",
      { cause: detail || `status ${String(response.status)}` },
    );
  }
  return response;
}

export async function* streamReply(
  rawRequest: RuntimeRequest,
  signal?: AbortSignal,
): AsyncGenerator<RuntimeEvent> {
  const request = runtimeRequestSchema.parse(rawRequest);
  const response = await postToRuntime(
    "/v1/chat/completions",
    request,
    chatCompletionBody(request, true),
    signal,
  );
  if (!response.body) {
    throw new PilotAiRuntimeError(
      "Pilot couldn't complete this response. Try sending it again.",
      { cause: "Runtime returned an empty stream." },
    );
  }
  yield* parseRuntimeStream(response.body);
}

async function postCleanup(path: string, input: object, what: string) {
  const runtimeToken = await getPilotRuntimeToken();
  const response = await fetch(runtimeUrl(path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pilot-runtime-token": runtimeToken,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new PilotAiRuntimeError(`${what} returned ${response.status}.`);
  }
}

export function deleteConversationMemory(input: {
  organizationId: string;
  workerId: string;
  conversationId: string;
  project?: { id: string; sharedMemoryEnabled: boolean };
}) {
  return postCleanup("/v1/conversations/delete", input, "Conversation cleanup");
}

/**
 * Forgets the runtime's own memory of a conversation from `cutoff` onward —
 * called before editing or regenerating a message, so the model does not
 * see stale content Pilot's own history no longer contains (see
 * ADR-0019 for why the runtime cannot be left to go stale here).
 */
export function truncateConversationMemory(input: {
  organizationId: string;
  workerId: string;
  conversationId: string;
  project?: { id: string; sharedMemoryEnabled: boolean };
  cutoff: Date;
}) {
  return postCleanup(
    "/v1/conversations/truncate",
    { ...input, cutoff: input.cutoff.toISOString() },
    "Conversation truncate",
  );
}

export function deleteProjectMemory(input: {
  organizationId: string;
  workerId: string;
  projectId: string;
}) {
  return postCleanup("/v1/projects/delete-memory", input, "Project cleanup");
}
