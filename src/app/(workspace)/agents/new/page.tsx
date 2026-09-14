import { isAgentKindId } from "@/agents/agent-kinds";
import { AgentForm } from "@/components/agents/agent-form";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New agent" };

export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  await requireWorkspaceSession();
  const { kind } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <header>
        <p className="text-sm text-muted-foreground">Agents</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          New agent
        </h1>
      </header>
      <AgentForm defaultKind={isAgentKindId(kind) ? kind : "chat"} />
    </main>
  );
}
