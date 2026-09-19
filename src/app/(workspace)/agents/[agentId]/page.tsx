import { notFound } from "next/navigation";
import { z } from "zod";

import { getAgent } from "@/agents/agent-repository";
import { AgentForm } from "@/components/agents/agent-form";
import { DeleteAgentButton } from "@/components/agents/delete-agent-button";
import { DuplicateAgentButton } from "@/components/agents/duplicate-agent-button";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { listPlugins } from "@/plugins/plugin-repository";
import { listSkills } from "@/skills/skill-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit agent" };

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  if (!z.uuid().safeParse(agentId).success) notFound();
  const { organizationId } = await requireWorkspaceSession();
  const [agent, skills, plugins] = await Promise.all([
    getAgent(organizationId, agentId),
    listSkills(organizationId),
    listPlugins(organizationId),
  ]);
  if (!agent || agent.archived) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader
        actions={
          <>
            <DuplicateAgentButton agentId={agent.id} name={agent.name} />
            <DeleteAgentButton agentId={agent.id} name={agent.name} />
          </>
        }
        eyebrow="Agents"
        title={agent.name}
      />
      <AgentForm
        agent={agent}
        defaultKind={agent.baseAgentId}
        plugins={plugins}
        skills={skills}
      />
    </main>
  );
}
