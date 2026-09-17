import { isAgentKindId } from "@/agents/agent-kinds";
import { AgentForm } from "@/components/agents/agent-form";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { listSkills } from "@/skills/skill-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New agent" };

export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { organizationId } = await requireWorkspaceSession();
  const [{ kind }, skills] = await Promise.all([
    searchParams,
    listSkills(organizationId),
  ]);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader eyebrow="Agents" title="New agent" />
      <AgentForm
        defaultKind={isAgentKindId(kind) ? kind : "chat"}
        skills={skills}
      />
    </main>
  );
}
