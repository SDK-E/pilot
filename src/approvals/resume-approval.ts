import "server-only";

import {
  isHtmlDocumentText,
  resumeToolApproval,
  type CompletedReply,
} from "@/ai/pilot-ai-client";
import {
  cancelClaimedConversationApproval,
  claimConversationApproval,
  completeConversationApproval,
} from "@/approvals/approval-repository";
import {
  createConversationMessage,
  getConversation,
} from "@/conversations/conversation-repository";
import { loadRuntimeAgent } from "@/conversations/runtime-agent";
import { allowedToolIds } from "@/conversations/tool-authorization";
import { finishExecution } from "@/executions/execution-repository";

export type ResumeApprovalResult =
  { ok: false; message: string } | { ok: true; approved: boolean };

type ClaimedApproval = NonNullable<
  Awaited<ReturnType<typeof claimConversationApproval>>
>;

const RESUMABLE_TOOL_IDS = [
  "web-search",
  "scratchpad",
  "code-sandbox",
] as const;

type ResumableApproval = ClaimedApproval & {
  conversationId: string;
  executionId: string;
  runtimeRunId: string;
  toolCallId: string;
  toolId: (typeof RESUMABLE_TOOL_IDS)[number];
};

function isResumable(
  approval: ClaimedApproval | undefined,
): approval is ResumableApproval {
  return Boolean(
    approval?.executionId &&
    approval.runtimeRunId &&
    approval.toolCallId &&
    (RESUMABLE_TOOL_IDS as readonly string[]).includes(approval.toolId ?? ""),
  );
}

interface ResumeInput {
  organizationId: string;
  userId: string;
  conversationId: string;
  approvalId: string;
  approved: boolean;
}

/**
 * Loads the conversation and agent, then atomically claims the approval so
 * no second decision can act on it. Returns the reason when that fails.
 */
async function claimResumableApproval(input: ResumeInput) {
  const owner = { organizationId: input.organizationId, userId: input.userId };
  const conversation = await getConversation(owner, input.conversationId);
  const agent = conversation
    ? await loadRuntimeAgent(input.organizationId, conversation.agentId)
    : undefined;
  if (!conversation || !agent) {
    return { ok: false as const, message: "This approval is unavailable." };
  }
  const claimed = await claimConversationApproval({
    approvalId: input.approvalId,
    organizationId: input.organizationId,
    conversationId: conversation.id,
    userId: input.userId,
  });
  const approval = claimed && { ...claimed, conversationId: conversation.id };
  if (!isResumable(approval)) {
    return {
      ok: false as const,
      message: "This approval has already been decided or is unavailable.",
    };
  }
  return { ok: true as const, owner, conversation, agent, approval };
}

/**
 * Decides one pending approval: claims it atomically, lets the runtime verify
 * and resume the exact suspended run, then records the reply. A failed resume
 * cancels the claim so the user can start a new request instead of retrying.
 */
export async function resumeApproval(
  input: ResumeInput,
): Promise<ResumeApprovalResult> {
  const claim = await claimResumableApproval(input);
  if (!claim.ok) return claim;
  const { owner, conversation, agent, approval } = claim;
  const granted = allowedToolIds(agent);
  if (!granted.includes(approval.toolId)) {
    return {
      ok: false,
      message: "This tool is no longer enabled for the selected agent.",
    };
  }

  try {
    const reply = await resumeToolApproval({
      organizationId: input.organizationId,
      worker: agent,
      conversationId: conversation.id,
      message: "Resume the approved request.",
      executionId: approval.executionId,
      allowedToolIds: granted,
      runtimeRunId: approval.runtimeRunId,
      toolCallId: approval.toolCallId,
      toolId: approval.toolId,
      approved: input.approved,
    });
    await recordResumedReply(owner, approval, reply);
    await completeConversationApproval({
      approvalId: approval.id,
      organizationId: input.organizationId,
      userId: input.userId,
      approved: input.approved,
      taskId: approval.taskId,
    });
    return { ok: true, approved: input.approved };
  } catch {
    await abandonResume(owner, approval);
    return {
      ok: false,
      message:
        "Pilot could not safely resume this approval. Start a new request instead.",
    };
  }
}

/**
 * Saves the runtime's reply as the agent's message and closes the execution.
 */
async function recordResumedReply(
  owner: { organizationId: string; userId: string },
  approval: ResumableApproval,
  reply: CompletedReply,
) {
  if (!reply.text || isHtmlDocumentText(reply.text)) {
    throw new Error("Pilot returned an invalid response.");
  }
  const message = await createConversationMessage(owner, {
    conversationId: approval.conversationId,
    role: "worker",
    content: reply.text,
    modelId: reply.modelId,
    runtimeRunId: reply.runId ?? undefined,
    inputTokens: reply.usage.inputTokens,
    outputTokens: reply.usage.outputTokens,
    totalTokens: reply.usage.totalTokens,
  });
  if (!message) throw new Error("Response persistence failed");
  await finishExecution({
    organizationId: owner.organizationId,
    executionId: approval.executionId,
    conversationMessageId: message.id,
    runtimeRunId: reply.runId,
  });
}

/**
 * Marks the execution failed and releases the claim so the user can start a
 * fresh request rather than retrying an uncertain resume.
 */
async function abandonResume(
  owner: { organizationId: string; userId: string },
  approval: ResumableApproval,
) {
  await finishExecution({
    organizationId: owner.organizationId,
    executionId: approval.executionId,
    errorMessage: "Approval resume failed",
  });
  await cancelClaimedConversationApproval({
    approvalId: approval.id,
    organizationId: owner.organizationId,
    userId: owner.userId,
    taskId: approval.taskId,
  });
}
