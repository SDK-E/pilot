import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { isAgentKindId, modeHref } from "@/agents/agent-kinds";
import { getAgent } from "@/agents/agent-repository";
import { listConversationApprovals } from "@/approvals/approval-repository";
import { ConversationShell } from "@/components/conversations/conversation-shell";
import { listConversationAttachments } from "@/conversations/attachment-repository";
import {
  getConversation,
  listConversationMessages,
} from "@/conversations/conversation-repository";
import { listMessageSources } from "@/conversations/message-sources";
import { getConversationScratchpad } from "@/conversations/scratchpad-repository";
import { listConversationActivity } from "@/executions/execution-repository";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import {
  getProjectMemoryContextForConversation,
  listProjects,
} from "@/projects/project-repository";
import { listConversationTasks } from "@/tasks/task-repository";
import { getUserPreferences } from "@/users/user-preference-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conversation" };

interface ConversationPageProps {
  params: Promise<{ mode: string; conversationId: string }>;
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { mode, conversationId } = await params;
  if (!isAgentKindId(mode) || !z.uuid().safeParse(conversationId).success) {
    notFound();
  }
  const { organizationId, user } = await requireWorkspaceSession();
  const owner = { organizationId, userId: user.id };
  const scope = { ...owner, conversationId };

  const conversation = await getConversation(owner, conversationId);
  if (!conversation) notFound();
  const agent = await getAgent(organizationId, conversation.agentId);
  if (!agent) notFound();
  // A conversation always opens in its agent's mode, whatever URL was used.
  if (agent.baseAgentId !== mode) {
    redirect(modeHref(agent.baseAgentId, conversationId));
  }

  const [
    messages,
    sources,
    activities,
    tasks,
    approvals,
    project,
    projects,
    attachments,
    scratchpad,
    preferences,
  ] = await Promise.all([
    listConversationMessages(owner, conversationId),
    listMessageSources(scope),
    listConversationActivity(organizationId, conversationId, user.id),
    listConversationTasks(scope),
    listConversationApprovals(scope),
    getProjectMemoryContextForConversation(scope),
    listProjects(owner),
    listConversationAttachments(scope),
    getConversationScratchpad(scope),
    getUserPreferences(user.id),
  ]);
  if (!messages) notFound();

  return (
    <ConversationShell
      kind={agent.baseAgentId}
      conversation={{
        id: conversation.id,
        title: conversation.title ?? "New conversation",
      }}
      agent={{ id: agent.id, name: agent.name }}
      messages={messages.map((message) => ({
        ...message,
        sources: sources.filter((source) => source.messageId === message.id),
      }))}
      activities={activities}
      tasks={tasks}
      approvals={approvals}
      project={project}
      projects={projects}
      attachments={attachments}
      scratchpad={scratchpad}
      initialPanelLayout={preferences.conversationPanelLayout ?? undefined}
      runtimeConfigured={Boolean(process.env.PILOT_AI_RUNTIME_URL?.trim())}
    />
  );
}
