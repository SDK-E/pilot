import { z } from "zod";

import { buildContinuationPrompt } from "@/conversations/continuation-prompt";
import {
  getConversationMessage,
  getPrecedingUserMessage,
  isLastMessage,
} from "@/conversations/conversation-message-repository";
import { forgetMessagesFrom } from "@/conversations/conversation-mutations";
import { getConversation } from "@/conversations/conversation-repository";
import { streamMessage } from "@/conversations/conversation-turn";
import { loadRuntimeAgent } from "@/conversations/runtime-agent";
import { hasRunningExecution } from "@/executions/execution-repository";
import { readJsonBody } from "@/lib/http";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureMessage,
} from "@/organizations/workspace-session";

import type { RuntimeAgent } from "@/conversations/runtime-agent";
import type { SessionFailure } from "@/organizations/workspace-session";

export const runtime = "nodejs";
// Comfortably above conversation-turn.ts's STREAM_TIMEOUT_MS plus a retry.
export const maxDuration = 180;

/**
 * This route's client (`useCompletion`) reads a non-OK response with
 * `response.text()` and uses that verbatim as the error it surfaces in
 * chat — it never parses JSON. The shared `errorResponse` helper returns a
 * `{ error }` JSON body for routes that fetch and parse it themselves;
 * using it here would show the user a literal `{"error":"..."}` string.
 */
function error(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

const promptField = z.string().trim().min(1).max(10_000);
// The composer's per-message connector toggle and skill picker. Omitted
// connectorToolIds means every available connector stays on; see
// `MessageToolOverrides` in tool-authorization.ts.
const connectorToolIdsField = z.array(z.string()).max(20).optional();
const skillIdsField = z.array(z.uuid()).max(10).optional();
const attachmentIdsField = z.array(z.uuid()).max(20).optional();

const inputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("send"),
    prompt: promptField,
    connectorToolIds: connectorToolIdsField,
    skillIds: skillIdsField,
    attachmentIds: attachmentIdsField,
  }),
  z.object({
    mode: z.literal("edit"),
    messageId: z.uuid(),
    prompt: promptField,
    connectorToolIds: connectorToolIdsField,
    skillIds: skillIdsField,
    attachmentIds: attachmentIdsField,
  }),
  z.object({ mode: z.literal("regenerate"), messageId: z.uuid() }),
  z.object({ mode: z.literal("continue"), messageId: z.uuid() }),
]);

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

interface Turn {
  organizationId: string;
  userId: string;
  agent: RuntimeAgent;
  conversationId: string;
}

function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

/**
 * Rewrites a sent user message: forgets it and everything after it, then
 * resends the edited text as a normal new turn.
 */
interface EditRequest {
  messageId: string;
  prompt: string;
  connectorToolIds?: readonly string[];
  skillIds?: readonly string[];
  attachmentIds?: readonly string[];
}

async function startEdit(
  turn: Turn,
  edit: EditRequest,
  clientSignal: AbortSignal,
): Promise<Response | ReadableStream<Uint8Array>> {
  const target = await getConversationMessage(
    turn,
    turn.conversationId,
    edit.messageId,
  );
  if (target?.role !== "user")
    return error("This message can't be edited.", 400);
  if (await hasRunningExecution(turn.organizationId, turn.conversationId))
    return error(
      "Pilot is still responding. Wait for it to finish first.",
      409,
    );
  await forgetMessagesFrom(
    { ...turn, agentId: turn.agent.id },
    turn.conversationId,
    target.createdAt,
    edit.attachmentIds ?? [],
  );
  return streamMessage(
    {
      ...turn,
      message: edit.prompt,
      requestedConnectorToolIds: edit.connectorToolIds,
      activeSkillIds: edit.skillIds,
      attachmentIds: edit.attachmentIds,
    },
    clientSignal,
  );
}

/**
 * Re-runs the last assistant reply: forgets it, then resends the user
 * message that produced it without creating a duplicate.
 */
async function startRegenerate(
  turn: Turn,
  messageId: string,
  clientSignal: AbortSignal,
): Promise<Response | ReadableStream<Uint8Array>> {
  const target = await getConversationMessage(
    turn,
    turn.conversationId,
    messageId,
  );
  if (target?.role !== "worker")
    return error("This message can't be regenerated.", 400);
  if (!(await isLastMessage(turn.conversationId, target.id, target.createdAt)))
    return error("Only the most recent response can be regenerated.", 400);
  if (await hasRunningExecution(turn.organizationId, turn.conversationId))
    return error(
      "Pilot is still responding. Wait for it to finish first.",
      409,
    );
  const precedingUserMessage = await getPrecedingUserMessage(
    turn.conversationId,
    target.createdAt,
  );
  if (!precedingUserMessage)
    return error("This message can't be regenerated.", 400);
  await forgetMessagesFrom(
    { ...turn, agentId: turn.agent.id },
    turn.conversationId,
    target.createdAt,
  );
  return streamMessage(
    { ...turn, message: precedingUserMessage.content },
    clientSignal,
    precedingUserMessage.id,
  );
}

/**
 * Resumes a stopped reply: resends the untouched user message with a
 * synthetic continuation prompt, appending the result onto the same
 * message instead of starting a new one. Nothing is forgotten — unlike edit
 * and regenerate, continue never discards anything.
 */
async function startContinue(
  turn: Turn,
  messageId: string,
  clientSignal: AbortSignal,
): Promise<Response | ReadableStream<Uint8Array>> {
  const target = await getConversationMessage(
    turn,
    turn.conversationId,
    messageId,
  );
  if (target?.role !== "worker" || !target.isPartial)
    return error("This message can't be continued.", 400);
  if (!(await isLastMessage(turn.conversationId, target.id, target.createdAt)))
    return error("Only the most recent response can be continued.", 400);
  if (await hasRunningExecution(turn.organizationId, turn.conversationId))
    return error(
      "Pilot is still responding. Wait for it to finish first.",
      409,
    );
  const precedingUserMessage = await getPrecedingUserMessage(
    turn.conversationId,
    target.createdAt,
  );
  if (!precedingUserMessage)
    return error("This message can't be continued.", 400);
  return streamMessage(
    {
      ...turn,
      message: buildContinuationPrompt(target.content),
      appendToMessageId: target.id,
    },
    clientSignal,
    precedingUserMessage.id,
  );
}

function runTurn(
  turn: Turn,
  input: z.infer<typeof inputSchema>,
  clientSignal: AbortSignal,
): Promise<Response | ReadableStream<Uint8Array>> {
  if (input.mode === "send")
    return streamMessage(
      {
        ...turn,
        message: input.prompt,
        requestedConnectorToolIds: input.connectorToolIds,
        activeSkillIds: input.skillIds,
        attachmentIds: input.attachmentIds,
      },
      clientSignal,
    );
  if (input.mode === "edit")
    return startEdit(
      turn,
      {
        messageId: input.messageId,
        prompt: input.prompt,
        connectorToolIds: input.connectorToolIds,
        skillIds: input.skillIds,
        attachmentIds: input.attachmentIds,
      },
      clientSignal,
    );
  if (input.mode === "regenerate")
    return startRegenerate(turn, input.messageId, clientSignal);
  return startContinue(turn, input.messageId, clientSignal);
}

function sessionFailureError(failure: SessionFailure): Response {
  return error(
    sessionFailureMessage(failure),
    failure === "signed-out" ? 401 : 403,
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureError(session);
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };

  const { conversationId: rawConversationId } = await params;
  const conversationId = z.uuid().safeParse(rawConversationId);
  if (!conversationId.success) return error("Conversation not found.", 404);
  const input = inputSchema.safeParse(await readJsonBody(request));
  if (!input.success) return error("A message is required.", 400);

  const conversation = await getConversation(owner, conversationId.data);
  const agent = conversation
    ? await loadRuntimeAgent(
        owner.organizationId,
        conversation.agentId,
        owner.userId,
      )
    : undefined;
  if (!conversation || !agent)
    return error("This conversation is unavailable.", 404);
  const turn: Turn = { ...owner, agent, conversationId: conversation.id };

  let result: Response | ReadableStream<Uint8Array>;
  try {
    result = await runTurn(turn, input.data, request.signal);
  } catch (streamError) {
    // eslint-disable-next-line no-console -- only path to surface this server-side
    console.error("Stream route failed to start a turn:", {
      name: streamError instanceof Error ? streamError.name : "unknown",
    });
    return error("Pilot could not start this response.", 502);
  }
  if (isResponse(result)) return result;
  return new Response(result, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
