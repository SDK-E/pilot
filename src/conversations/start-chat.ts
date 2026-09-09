import "server-only";

import { createConversation } from "@/conversations/conversation-repository";
import { deriveConversationTitle } from "@/conversations/conversation-title";
import {
  createWorker,
  getWorker,
  getWorkerByBaseAgentId,
} from "@/workers/worker-repository";

type ActiveMembership = {
  id: string;
  organizationName: string;
  role: { slug: string };
};

type StartChatInput = {
  organizationId: string;
  membership: ActiveMembership;
  user: { id: string; email: string };
  message: string;
  workerId?: string;
};

export type PreparedConversation =
  | { ok: false; message: string }
  | {
      ok: true;
      conversation: { id: string };
      worker: {
        id: string;
        instructions: string;
        modelId: "kilo/kilo-auto/free";
        baseAgentId: "conversational" | "research";
        enabledToolIds: string[];
        approvalRules: Record<string, string>;
      };
    };

/**
 * Creates a conversation only after a validated non-empty prompt. This shared
 * server-only path is used by both the no-JavaScript form fallback and the
 * streaming Route Handler.
 */
export async function prepareConversation(
  input: StartChatInput,
): Promise<PreparedConversation> {
  const selectedAgent = input.workerId
    ? await getWorker(input.organizationId, input.workerId)
    : undefined;
  if (
    selectedAgent?.baseAgentId === "research" &&
    process.env.PILOT_RESEARCH_ENABLED !== "true"
  ) {
    return {
      ok: false,
      message: "Research is not enabled for this environment yet.",
    };
  }

  let agent =
    selectedAgent ??
    (await getWorkerByBaseAgentId(input.organizationId, "conversational"));
  if (!agent) {
    try {
      agent = await createWorker({
        organization: {
          id: input.organizationId,
          name: input.membership.organizationName,
        },
        member: {
          id: input.membership.id,
          roleSlug: input.membership.role.slug,
        },
        user: input.user,
        worker: {
          name: "Pilot",
          instructions:
            "You are Pilot, a clear and practical conversational assistant. Ask concise follow-up questions when needed and state useful next steps.",
          modelId: "kilo/kilo-auto/free",
          baseAgentId: "conversational",
          enabledToolIds: [],
          knowledgeSourceIds: [],
          approvalRules: {},
        },
      });
    } catch (error) {
      if (!(
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      )) {
        throw error;
      }
      agent = await getWorkerByBaseAgentId(
        input.organizationId,
        "conversational",
      );
    }
  }
  if (!agent) {
    return {
      ok: false,
      message: "Pilot could not prepare the Conversational agent.",
    };
  }

  const worker = await getWorker(input.organizationId, agent.id);
  if (
    !worker ||
    worker.modelId !== "kilo/kilo-auto/free" ||
    (worker.baseAgentId !== "conversational" &&
      worker.baseAgentId !== "research")
  ) {
    return { ok: false, message: "This agent is unavailable." };
  }

  const conversation = await createConversation({
    organizationId: input.organizationId,
    workerId: worker.id,
    createdByWorkosUserId: input.user.id,
    title: deriveConversationTitle(input.message),
  });
  if (!conversation) {
    return { ok: false, message: "Pilot could not start a chat." };
  }

  return {
    ok: true,
    conversation,
    worker: {
      id: worker.id,
      instructions: worker.instructions,
      modelId: "kilo/kilo-auto/free",
      baseAgentId: worker.baseAgentId,
      enabledToolIds: worker.enabledToolIds,
      approvalRules: worker.approvalRules,
    },
  };
}
