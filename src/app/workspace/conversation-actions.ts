"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getConversation } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { createTask } from "@/tasks/task-repository";

const inputSchema = z.object({
  workerId: z.uuid(),
  conversationId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().min(1).max(10_000),
});

export type CreateConversationTaskState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export async function createConversationTaskAction(
  _previousState: CreateConversationTaskState,
  formData: FormData,
): Promise<CreateConversationTaskState> {
  const input = inputSchema.safeParse({
    workerId: formData.get("workerId"),
    conversationId: formData.get("conversationId"),
    title: formData.get("title"),
    instructions: formData.get("instructions"),
  });
  if (!input.success) {
    return { status: "error", message: "Add a task title and instructions." };
  }

  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return { status: "error", message: "Choose an organization first." };
  }
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) {
    return {
      status: "error",
      message: "Your organization access is no longer active.",
    };
  }
  const conversation = await getConversation(
    organizationId,
    input.data.workerId,
    input.data.conversationId,
    user.id,
  );
  if (!conversation) {
    return { status: "error", message: "This conversation is unavailable." };
  }

  const task = await createTask({
    ...input.data,
    organizationId,
    createdByWorkosUserId: user.id,
  });
  if (!task) {
    return { status: "error", message: "This conversation is unavailable." };
  }
  revalidatePath(
    `/workspace/workers/${input.data.workerId}/conversations/${input.data.conversationId}`,
  );
  return { status: "success", message: "Task added to this chat." };
}

const approvalDecisionSchema = z.object({
  workerId: z.uuid(),
  conversationId: z.uuid(),
  approvalId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
});

export type DecideConversationApprovalState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export async function decideConversationApprovalAction(
  _previousState: DecideConversationApprovalState,
  formData: FormData,
): Promise<DecideConversationApprovalState> {
  const input = approvalDecisionSchema.safeParse({
    workerId: formData.get("workerId"),
    conversationId: formData.get("conversationId"),
    approvalId: formData.get("approvalId"),
    decision: formData.get("decision"),
  });
  if (!input.success)
    return { status: "error", message: "This approval is unavailable." };

  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    return { status: "error", message: "Choose an organization first." };
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    return {
      status: "error",
      message: "Your organization access is no longer active.",
    };
  const [conversation, worker] = await Promise.all([
    getConversation(
      organizationId,
      input.data.workerId,
      input.data.conversationId,
      user.id,
    ),
    (await import("@/workers/worker-repository")).getWorker(
      organizationId,
      input.data.workerId,
    ),
  ]);
  if (!conversation || !worker || worker.baseAgentId !== "research")
    return { status: "error", message: "This approval is unavailable." };

  const {
    claimConversationApproval,
    completeConversationApproval,
    cancelClaimedConversationApproval,
  } = await import("@/approvals/approval-repository");
  const approval = await claimConversationApproval({
    approvalId: input.data.approvalId,
    organizationId,
    conversationId: conversation.id,
    userId: user.id,
  });
  if (!approval?.executionId || !approval.runtimeRunId || !approval.toolCallId)
    return {
      status: "error",
      message: "This approval has already been decided or is unavailable.",
    };

  const approved = input.data.decision === "approve";
  try {
    const { resumeResearchApproval } = await import("@/ai/pilot-ai-client");
    const reply = await resumeResearchApproval({
      organizationId,
      worker: {
        id: worker.id,
        instructions: worker.instructions,
        modelId: "kilo/kilo-auto/free",
        baseAgentId: "research",
        enabledToolIds: worker.enabledToolIds,
        approvalRules: worker.approvalRules,
      },
      conversationId: conversation.id,
      message: "Resume the approved research request.",
      executionId: approval.executionId,
      allowedToolIds: ["web-search"],
      runtimeRunId: approval.runtimeRunId,
      toolCallId: approval.toolCallId,
      approved,
    });
    const { createConversationMessage } =
      await import("@/conversations/conversation-repository");
    const workerMessage = await createConversationMessage({
      organizationId,
      workerId: worker.id,
      conversationId: conversation.id,
      createdByWorkosUserId: user.id,
      role: "worker",
      content: reply.text,
      modelId: reply.modelId,
      runtimeRunId: reply.runId ?? undefined,
      inputTokens: reply.usage.inputTokens,
      outputTokens: reply.usage.outputTokens,
      totalTokens: reply.usage.totalTokens,
    });
    if (!workerMessage) throw new Error("Response persistence failed");
    const { finishExecution } =
      await import("@/executions/execution-repository");
    await finishExecution({
      organizationId,
      executionId: approval.executionId,
      conversationMessageId: workerMessage.id,
      runtimeRunId: reply.runId,
    });
    await completeConversationApproval({
      approvalId: approval.id,
      organizationId,
      userId: user.id,
      approved,
      taskId: approval.taskId,
    });
  } catch {
    const { finishExecution } =
      await import("@/executions/execution-repository");
    await finishExecution({
      organizationId,
      executionId: approval.executionId,
      errorMessage: "Approval resume failed",
    });
    await cancelClaimedConversationApproval({
      approvalId: approval.id,
      organizationId,
      userId: user.id,
      taskId: approval.taskId,
    });
    return {
      status: "error",
      message:
        "Pilot could not safely resume this approval. Start a new request instead.",
    };
  }
  revalidatePath(
    `/workspace/workers/${input.data.workerId}/conversations/${input.data.conversationId}`,
  );
  return {
    status: "success",
    message: approved ? "Web search approved." : "Web search declined.",
  };
}
