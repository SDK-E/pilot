import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";
import { z } from "zod";

import { approvalRequiredToolIds } from "@/agents/agent-tools";

import {
  approvableToolIdSchema,
  completionSchema,
  PilotAiRuntimeError,
  runtimeRequestSchema,
  toCompleted,
  type ApprovableToolId,
  type CompletedReply,
  type RuntimeEvent,
  type RuntimeRequest,
} from "./runtime-contract";
import { parseRuntimeStream } from "./runtime-stream";

export {
  isHtmlDocumentText,
  PilotAiRuntimeError,
  type CompletedReply,
  type RuntimeEvent,
  type RuntimeRequest,
} from "./runtime-contract";

/**
 * Server-only HTTP client for Pilot AI. Every call carries the Vercel OIDC
 * token, so the runtime can verify that Pilot, and not a browser, is calling.
 */

function runtimeUrl(path: string): URL {
  const value = process.env.PILOT_AI_RUNTIME_URL?.trim();
  if (!value) {
    throw new PilotAiRuntimeError(
      "Pilot AI is not configured for this environment.",
    );
  }
  const base = new URL(value);
  if (base.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new PilotAiRuntimeError(
      "Pilot AI requires an HTTPS URL in production.",
    );
  }
  return new URL(path, base);
}

async function runtimeHeaders(request: RuntimeRequest) {
  const oidcToken = await getVercelOidcToken();
  const approvalRequired = approvalRequiredToolIds(
    request.worker,
    request.allowedToolIds,
  );
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
    "x-pilot-approval-required-tool-ids": JSON.stringify(approvalRequired),
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
    // silently discarded here. It goes in `cause`, not the message: this
    // error's message reaches the chat client as-is (conversation-turn.ts
    // streams it through), so it must stay generic and detail-free.
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // Fall through with no detail; the status code alone still throws below.
    }
    throw new PilotAiRuntimeError(`Pilot AI returned ${response.status}.`, {
      cause: detail || undefined,
    });
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
    throw new PilotAiRuntimeError("Pilot AI returned an empty stream.");
  }
  yield* parseRuntimeStream(response.body);
}

export async function resumeToolApproval(
  input: RuntimeRequest & {
    runtimeRunId: string;
    toolCallId: string;
    toolId: ApprovableToolId;
    approved: boolean;
  },
): Promise<CompletedReply> {
  const request = runtimeRequestSchema
    .extend({
      runtimeRunId: z.string().min(1),
      toolCallId: z.string().min(1),
      toolId: approvableToolIdSchema,
      approved: z.boolean(),
    })
    .parse(input);
  const response = await postToRuntime(
    "/v1/approvals/resume",
    request,
    JSON.stringify(request),
  );
  return toCompleted(completionSchema.parse(await response.json()));
}

async function postCleanup(path: string, input: object, what: string) {
  const oidcToken = await getVercelOidcToken();
  const response = await fetch(runtimeUrl(path), {
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

export function deleteProjectMemory(input: {
  organizationId: string;
  workerId: string;
  projectId: string;
}) {
  return postCleanup("/v1/projects/delete-memory", input, "Project cleanup");
}
