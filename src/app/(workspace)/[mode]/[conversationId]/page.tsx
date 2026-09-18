import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { isAgentKindId, modeHref } from "@/agents/agent-kinds";
import { getAgent } from "@/agents/agent-repository";
import { ConversationShell } from "@/components/conversations/conversation-shell";
import { hasActiveCustomConnector } from "@/connectors/connector-definition-repository";
import { listConversationAttachments } from "@/conversations/attachment-repository";
import {
  getConversation,
  listConversationMessages,
} from "@/conversations/conversation-repository";
import { listMessageSources } from "@/conversations/message-sources";
import { getConversationPlan } from "@/conversations/plan-repository";
import { getConversationScratchpad } from "@/conversations/scratchpad-repository";
import { isConnectorAvailable } from "@/conversations/tool-authorization";
import { listConversationActivity } from "@/executions/execution-repository";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import {
  getProjectMemoryContextForConversation,
  listProjects,
} from "@/projects/project-repository";
import { grantedSkillIds } from "@/skills/agent-skill-grants";
import { listSkills } from "@/skills/skill-repository";
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
    project,
    projects,
    attachments,
    scratchpad,
    plan,
    preferences,
    organizationPreferences,
    organizationSkills,
    customConnectorActive,
  ] = await Promise.all([
    listConversationMessages(owner, conversationId),
    listMessageSources(scope),
    listConversationActivity(organizationId, conversationId, user.id),
    getProjectMemoryContextForConversation(scope),
    listProjects(owner),
    listConversationAttachments(scope),
    getConversationScratchpad(scope),
    getConversationPlan(scope),
    getUserPreferences(user.id),
    getOrganizationPreferences(organizationId),
    listSkills(organizationId),
    hasActiveCustomConnector(organizationId),
  ]);
  if (!messages) notFound();

  const hasConnector = isConnectorAvailable(agent, {
    ...organizationPreferences,
    hasActiveCustomConnector: customConnectorActive,
  });
  const granted = new Set(grantedSkillIds(agent, organizationSkills));

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
      project={project}
      projects={projects}
      attachments={attachments}
      hasConnector={hasConnector}
      scratchpad={scratchpad}
      plan={plan}
      skills={organizationSkills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        granted: granted.has(skill.id),
      }))}
      initialPanelLayout={preferences.conversationPanelLayout ?? undefined}
      runtimeConfigured={Boolean(process.env.PILOT_AI_RUNTIME_URL?.trim())}
    />
  );
}
