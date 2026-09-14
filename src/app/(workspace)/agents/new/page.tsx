import { isAgentKindId } from "@/agents/agent-kinds";
import { AgentForm } from "@/components/agents/agent-form";
import { PageHeader } from "@/components/workspace/page-header";
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
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader eyebrow="Agents" title="New agent" />
      <AgentForm defaultKind={isAgentKindId(kind) ? kind : "chat"} />
    </main>
  );
}
