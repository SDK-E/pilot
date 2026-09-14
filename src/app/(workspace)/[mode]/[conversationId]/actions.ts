"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { modeHref } from "@/agents/agent-kinds";
import { deleteConversationMemory } from "@/ai/pilot-ai-client";
import { resumeApproval } from "@/approvals/resume-approval";
import {
  deleteConversation,
  getConversation,
  renameConversation,
} from "@/conversations/conversation-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureMessage,
} from "@/organizations/workspace-session";
import { getProjectMemoryContextForConversation } from "@/projects/project-repository";
import { createTask } from "@/tasks/task-repository";
import { updateConversationPanelLayout } from "@/users/user-preference-repository";

export interface ActionState {
  message?: string;
  status: "idle" | "error" | "success";
}

const error = (message: string): ActionState => ({ status: "error", message });

async function ownerOrError() {
  const session = await getWorkspaceSession();
  return isWorkspaceSession(session)
    ? { organizationId: session.organizationId, userId: session.user.id }
    : error(sessionFailureMessage(session));
}

const renameSchema = z.object({
  conversationId: z.uuid(),
  title: z.string().trim().min(1).max(200),
});

export async function renameConversationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = renameSchema.safeParse({
    conversationId: formData.get("conversationId"),
    title: formData.get("title"),
  });
  if (!input.success) return error("Enter a conversation title.");
  const owner = await ownerOrError();
  if ("status" in owner) return owner;

  const renamed = await renameConversation(
    owner,
    input.data.conversationId,
    input.data.title,
  );
  if (!renamed) return error("This conversation is unavailable.");
  revalidatePath("/", "layout");
  return { status: "success", message: "Conversation renamed." };
}

export async function deleteConversationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = z
    .object({ conversationId: z.uuid() })
    .safeParse({ conversationId: formData.get("conversationId") });
  if (!input.success) return error("This conversation is unavailable.");
  const owner = await ownerOrError();
  if ("status" in owner) return owner;

  const conversation = await getConversation(owner, input.data.conversationId);
  if (!conversation) return error("This conversation is unavailable.");
  try {
    const project = await getProjectMemoryContextForConversation({
      ...owner,
      conversationId: conversation.id,
    });
    await deleteConversationMemory({
      organizationId: owner.organizationId,
      workerId: conversation.agentId,
      conversationId: conversation.id,
      project: project && {
        id: project.id,
        sharedMemoryEnabled: project.sharedMemoryEnabled,
      },
    });
    await deleteConversation(owner, conversation.id);
  } catch {
    return error("Pilot could not delete this conversation. Try again.");
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Conversation deleted." };
}

const taskSchema = z.object({
  conversationId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().min(1).max(10_000),
});

export async function createConversationTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = taskSchema.safeParse({
    conversationId: formData.get("conversationId"),
    title: formData.get("title"),
    instructions: formData.get("instructions"),
  });
  if (!input.success) return error("Add a task title and instructions.");
  const owner = await ownerOrError();
  if ("status" in owner) return owner;

  const conversation = await getConversation(owner, input.data.conversationId);
  if (!conversation) return error("This conversation is unavailable.");
  const task = await createTask({
    ...input.data,
    workerId: conversation.agentId,
    organizationId: owner.organizationId,
    createdByWorkosUserId: owner.userId,
  });
  if (!task) return error("This conversation is unavailable.");
  revalidatePath("/work");
  return { status: "success", message: "Task added to this conversation." };
}

const decisionSchema = z.object({
  mode: z.enum(["chat", "work", "code"]),
  conversationId: z.uuid(),
  approvalId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
});

export async function decideApprovalAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = decisionSchema.safeParse({
    mode: formData.get("mode"),
    conversationId: formData.get("conversationId"),
    approvalId: formData.get("approvalId"),
    decision: formData.get("decision"),
  });
  if (!input.success) return error("This approval is unavailable.");
  const owner = await ownerOrError();
  if ("status" in owner) return owner;

  const result = await resumeApproval({
    ...owner,
    conversationId: input.data.conversationId,
    approvalId: input.data.approvalId,
    approved: input.data.decision === "approve",
  });
  if (!result.ok) return error(result.message);
  revalidatePath(modeHref(input.data.mode, input.data.conversationId));
  revalidatePath("/work");
  return {
    status: "success",
    message: result.approved ? "Tool use approved." : "Tool use declined.",
  };
}

const panelLayoutSchema = z.object({
  conversation: z.number().min(20).max(90),
  details: z.number().min(10).max(80),
});

export async function savePanelLayoutAction(input: {
  conversation: number;
  details: number;
}) {
  const parsed = panelLayoutSchema.safeParse(input);
  if (!parsed.success) return;
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return;
  await updateConversationPanelLayout({
    workosUserId: session.user.id,
    conversationPanelLayout: parsed.data,
  });
}
