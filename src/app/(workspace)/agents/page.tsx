import { RiAddLine } from "@remixicon/react";
import Link from "next/link";

import { AGENT_KIND_IDS, AGENT_KINDS } from "@/agents/agent-kinds";
import { listAgents } from "@/agents/agent-repository";
import { AgentCard } from "@/components/agents/agent-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ModeIcon } from "@/components/workspace/mode-icon";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Agents" };

/**
 * Every configured agent, grouped by mode. An agent is a named set of
 * instructions and tool rules on top of one of the three base kinds.
 */
export default async function AgentsPage() {
  const { organizationId, membership } = await requireWorkspaceSession();
  const agents = await listAgents(organizationId);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <PageHeader
        description="Give each mode the agents your team needs: a name, instructions, and which tools it may use. Pilot creates a default agent the first time a mode is used."
        eyebrow={membership.organizationName}
        title="Agents"
      />

      {AGENT_KIND_IDS.map((kindId) => {
        const kind = AGENT_KINDS[kindId];
        const kindAgents = agents.filter(
          (agent) => agent.baseAgentId === kindId,
        );
        return (
          <section
            aria-labelledby={`agents-${kindId}`}
            className="space-y-3"
            key={kindId}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                className="flex items-center gap-2 text-sm font-medium"
                id={`agents-${kindId}`}
              >
                <ModeIcon
                  className="size-4 text-muted-foreground"
                  kind={kindId}
                />
                {kind.name}
              </h2>
              <Button asChild size="sm" variant="outline">
                <Link href={`/agents/new?kind=${kindId}`}>
                  <RiAddLine aria-hidden="true" /> New agent
                </Link>
              </Button>
            </div>
            {kindAgents.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {kindAgents.map((agent) => (
                  <li key={agent.id}>
                    <AgentCard agent={agent} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No {kind.name} agents yet</EmptyTitle>
                  <EmptyDescription>
                    {kind.defaultAgent.name} is created on first use.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>
        );
      })}
    </main>
  );
}
