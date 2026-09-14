import { notFound } from "next/navigation";

import { agentKind, isAgentKindId } from "@/agents/agent-kinds";
import { listAgents } from "@/agents/agent-repository";
import { listApprovals } from "@/approvals/approval-repository";
import { NewConversationForm } from "@/components/conversations/new-conversation-form";
import { WorkQueue } from "@/components/work/work-queue";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { listTasks } from "@/tasks/task-repository";

import type { Metadata } from "next";

interface ModePageProps {
  params: Promise<{ mode: string }>;
}

export async function generateMetadata({
  params,
}: ModePageProps): Promise<Metadata> {
  const { mode } = await params;
  return { title: isAgentKindId(mode) ? agentKind(mode).name : "Pilot" };
}

/**
 * The start screen of one mode: a composer, the agents of that kind, and for
 * Work the queue of tasks and approvals.
 */
export default async function ModePage({ params }: ModePageProps) {
  const { mode } = await params;
  if (!isAgentKindId(mode)) notFound();
  const kind = agentKind(mode);
  const { organizationId, user } = await requireWorkspaceSession();
  const owner = { organizationId, userId: user.id };

  const [agents, preferences] = await Promise.all([
    listAgents(organizationId),
    getOrganizationPreferences(organizationId),
  ]);
  const kindAgents = agents.filter((agent) => agent.baseAgentId === kind.id);
  const [tasks, approvals] =
    kind.id === "work"
      ? await Promise.all([listTasks(owner), listApprovals(owner)])
      : [[], []];

  return (
    <main className="flex min-h-[calc(100svh-3rem)] flex-1 flex-col items-center p-6 sm:py-16">
      <section className="w-full max-w-2xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {kind.name}
          </h1>
          <p className="mx-auto max-w-md text-pretty text-xs/relaxed text-muted-foreground">
            {kind.tagline}
          </p>
        </header>
        <NewConversationForm
          kind={kind.id}
          agents={kindAgents.map((agent) => ({
            id: agent.id,
            name: agent.name,
          }))}
          defaultAgentId={preferences.defaultWorkerId}
        />
        {kind.id === "work" ? (
          <WorkQueue tasks={tasks} approvals={approvals} />
        ) : null}
      </section>
    </main>
  );
}
