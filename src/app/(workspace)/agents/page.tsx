import { Plus } from "lucide-react";
import Link from "next/link";

import { AGENT_KIND_IDS, AGENT_KINDS } from "@/agents/agent-kinds";
import { listAgents } from "@/agents/agent-repository";
import { AgentCard } from "@/components/agents/agent-card";
import { Button } from "@/components/ui/button";
import { ModeIcon } from "@/components/workspace/mode-icon";
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
    <main className="mx-auto w-full max-w-5xl space-y-10 px-5 py-8 sm:px-8 sm:py-10">
      <header>
        <p className="text-sm text-muted-foreground">
          {membership.organizationName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Agents</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Give each mode the agents your team needs: a name, instructions, and
          which tools it may use. Pilot creates a default agent the first time a
          mode is used.
        </p>
      </header>

      {AGENT_KIND_IDS.map((kindId) => {
        const kind = AGENT_KINDS[kindId];
        const kindAgents = agents.filter(
          (agent) => agent.baseAgentId === kindId,
        );
        return (
          <section key={kindId} aria-labelledby={`agents-${kindId}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                className="flex items-center gap-2 text-lg font-medium"
                id={`agents-${kindId}`}
              >
                <ModeIcon className="size-4 text-primary" kind={kindId} />
                {kind.name}
              </h2>
              <Button asChild size="sm" variant="outline">
                <Link href={`/agents/new?kind=${kindId}`}>
                  <Plus aria-hidden="true" /> New {kind.name} agent
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
              <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                No {kind.name} agents yet. {kind.defaultAgent.name} is created
                on first use.
              </p>
            )}
          </section>
        );
      })}
    </main>
  );
}
