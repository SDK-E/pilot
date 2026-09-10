import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { ConversationShell } from "@/components/conversations/conversation-shell";
import { listConversationAttachments } from "@/conversations/attachment-repository";
import {
  getConversation,
  listConversationMessages,
} from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { listConversationActivity } from "@/executions/execution-repository";
import { getWorker } from "@/workers/worker-repository";
import { listConversationTasks } from "@/tasks/task-repository";
import { listConversationApprovals } from "@/approvals/approval-repository";
import {
  getProjectMemoryContextForConversation,
  listProjects,
} from "@/projects/project-repository";

export const metadata: Metadata = { title: "Conversation" };

const conversationIdSchema = z.uuid();
const workerIdSchema = z.uuid();

type ConversationPageProps = {
  params: Promise<{ conversationId: string; workerId: string }>;
};

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { conversationId, workerId } = await params;
  if (
    !conversationIdSchema.safeParse(conversationId).success ||
    !workerIdSchema.safeParse(workerId).success
  ) {
    notFound();
  }
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    redirect("/workspace");
  }

  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) notFound();

  const [
    worker,
    conversation,
    messages,
    activities,
    tasks,
    approvals,
    project,
    projects,
    attachments,
  ] = await Promise.all([
    getWorker(organizationId, workerId),
    getConversation(organizationId, workerId, conversationId, user.id),
    listConversationMessages(organizationId, workerId, conversationId, user.id),
    listConversationActivity(organizationId, conversationId, user.id),
    listConversationTasks({
      organizationId,
      conversationId,
      userId: user.id,
    }),
    listConversationApprovals({
      organizationId,
      conversationId,
      userId: user.id,
    }),
    getProjectMemoryContextForConversation({
      organizationId,
      userId: user.id,
      conversationId,
    }),
    listProjects({ organizationId, userId: user.id }),
    listConversationAttachments({
      organizationId,
      conversationId,
      userId: user.id,
    }),
  ]);
  if (!worker || !conversation || !messages) notFound();

  const isRuntimeConfigured = Boolean(process.env.PILOT_AI_RUNTIME_URL?.trim());

  return (
    <ConversationShell
      backHref="/workspace/chats"
      conversationId={conversation.id}
      messages={messages}
      activities={activities}
      tasks={tasks}
      approvals={approvals}
      runtimeConfigured={isRuntimeConfigured}
      title={conversation.title ?? "New conversation"}
      agentId={worker.id}
      agentName={worker.name}
      project={project}
      projects={projects}
      attachments={attachments}
    />
  );
}
