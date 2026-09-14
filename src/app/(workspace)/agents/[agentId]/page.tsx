import { notFound } from "next/navigation";
import { z } from "zod";

import { getAgent } from "@/agents/agent-repository";
import { AgentForm } from "@/components/agents/agent-form";
import { DeleteAgentButton } from "@/components/agents/delete-agent-button";
import { DuplicateAgentButton } from "@/components/agents/duplicate-agent-button";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

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
  const agent = await getAgent(organizationId, agentId);
  if (!agent || agent.archived) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Agents</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {agent.name}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <DuplicateAgentButton agentId={agent.id} name={agent.name} />
          <DeleteAgentButton agentId={agent.id} name={agent.name} />
        </div>
      </header>
      <AgentForm agent={agent} defaultKind={agent.baseAgentId} />
    </main>
  );
}
