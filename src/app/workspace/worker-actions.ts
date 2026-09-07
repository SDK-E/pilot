"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PilotAiRuntimeError } from "@/ai/pilot-ai-client";
import { sendConversationMessage } from "@/conversations/send-message";
import {
  approvalModes,
  baseAgentIds,
  configurableToolIds,
} from "@/agents/agent-configuration";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import type { WorkerCreationState } from "@/workers/worker-creation-state";
import { createConversation } from "@/conversations/conversation-repository";
import {
  createWorker,
  getWorkerByBaseAgentId,
  getWorker,
  updateWorker,
} from "@/workers/worker-repository";

const workerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  instructions: z
    .string()
    .trim()
    .min(1, "Instructions are required.")
    .max(10_000),
  modelId: z.literal("kilo/kilo-auto/free"),
  baseAgentId: z.enum(baseAgentIds),
  goals: z.string().trim().max(5_000).optional(),
  tone: z.string().trim().max(200).optional(),
  outputFormat: z.string().trim().max(1_000).optional(),
  enabledToolIds: z.array(z.enum(configurableToolIds)).default([]),
  approvalMode: z.enum(approvalModes),
});

export async function createWorkerAction(
  _previousState: WorkerCreationState,
  formData: FormData,
): Promise<WorkerCreationState> {
  const parsed = workerInputSchema.safeParse({
    name: formData.get("name"),
    instructions: formData.get("instructions"),
    modelId: formData.get("modelId"),
    baseAgentId: formData.get("baseAgentId"),
    goals: formData.get("goals") || undefined,
    tone: formData.get("tone") || undefined,
    outputFormat: formData.get("outputFormat") || undefined,
    enabledToolIds: formData.getAll("enabledToolIds"),
    approvalMode: formData.get("approvalMode"),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message, status: "error" };
  }

  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return {
      message: "Choose an organization before creating a worker.",
      status: "error",
    };
  }

  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) {
    return {
      message: "Your organization access is no longer active.",
      status: "error",
    };
  }

  try {
    const worker = await createWorker({
      organization: {
        id: organizationId,
        name: membership.organizationName,
      },
      member: { id: membership.id, roleSlug: membership.role.slug },
      user: { id: user.id, email: user.email },
      worker: {
        ...parsed.data,
        approvalRules: Object.fromEntries(
          parsed.data.enabledToolIds.map((toolId) => [
            toolId,
            parsed.data.approvalMode,
          ]),
        ),
        knowledgeSourceIds: [],
      },
    });
    revalidatePath("/workspace");
    return {
      message: `${worker.name} is ready to configure.`,
      status: "success",
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return {
        message: "A worker with that name already exists in this organization.",
        status: "error",
      };
    }
    throw error;
  }
}

export async function updateWorkerAction(
  _previousState: WorkerCreationState,
  formData: FormData,
): Promise<WorkerCreationState> {
  const workerId = z.uuid().safeParse(formData.get("workerId"));
  const parsed = workerInputSchema.safeParse({
    name: formData.get("name"),
    instructions: formData.get("instructions"),
    modelId: formData.get("modelId"),
    baseAgentId: formData.get("baseAgentId"),
    goals: formData.get("goals") || undefined,
    tone: formData.get("tone") || undefined,
    outputFormat: formData.get("outputFormat") || undefined,
    enabledToolIds: formData.getAll("enabledToolIds"),
    approvalMode: formData.get("approvalMode"),
  });
  if (!workerId.success || !parsed.success)
    return {
      status: "error",
      message: parsed.success
        ? "This persona is unavailable."
        : parsed.error.issues[0]?.message,
    };
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    return {
      status: "error",
      message: "Choose an organization before updating a persona.",
    };
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    return {
      status: "error",
      message: "Your organization access is no longer active.",
    };
  try {
    const worker = await updateWorker(organizationId, workerId.data, {
      ...parsed.data,
      approvalRules: Object.fromEntries(
        parsed.data.enabledToolIds.map((toolId) => [
          toolId,
          parsed.data.approvalMode,
        ]),
      ),
      knowledgeSourceIds: [],
    });
    if (!worker)
      return { status: "error", message: "This persona is unavailable." };
    revalidatePath(`/workspace/workers/${worker.id}`);
    revalidatePath("/workspace/personas");
    return { status: "success", message: `${worker.name} was updated.` };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    )
      return {
        status: "error",
        message:
          "A persona with that name already exists in this organization.",
      };
    throw error;
  }
}

export type StartChatState = {
  message?: string;
  status: "idle" | "error" | "success";
  href?: string;
};

export async function startChatWithMessageAction(
  _previousState: StartChatState,
  formData: FormData,
): Promise<StartChatState> {
  const message = z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(10_000)
    .safeParse(formData.get("message"));
  if (!message.success)
    return { status: "error", message: message.error.issues[0]?.message };

  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    return { status: "error", message: "Choose an organization first." };
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership)
    return {
      status: "error",
      message: "Your organization access is no longer active.",
    };

  let agent = await getWorkerByBaseAgentId(organizationId, "conversational");
  if (!agent) {
    try {
      agent = await createWorker({
        organization: { id: organizationId, name: membership.organizationName },
        member: { id: membership.id, roleSlug: membership.role.slug },
        user: { id: user.id, email: user.email },
        worker: {
          name: "Conversational",
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
      ))
        throw error;
      agent = await getWorkerByBaseAgentId(organizationId, "conversational");
    }
  }
  if (!agent)
    return {
      status: "error",
      message: "Pilot could not prepare the Conversational agent.",
    };
  const conversation = await createConversation({
    organizationId,
    workerId: agent.id,
    createdByWorkosUserId: user.id,
  });
  if (!conversation)
    return { status: "error", message: "Pilot could not start a chat." };
  const worker = await getWorker(organizationId, agent.id);
  if (!worker || worker.modelId !== "kilo/kilo-auto/free")
    return { status: "error", message: "This agent is unavailable." };
  try {
    await sendConversationMessage({
      organizationId,
      worker: {
        id: worker.id,
        instructions: worker.instructions,
        modelId: "kilo/kilo-auto/free",
      },
      conversationId: conversation.id,
      message: message.data,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof PilotAiRuntimeError
          ? error.message
          : "Pilot could not complete this message. Try again.",
    };
  }
  return {
    status: "success",
    href: `/workspace/workers/${agent.id}/conversations/${conversation.id}`,
  };
}
