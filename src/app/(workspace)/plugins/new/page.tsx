import { listCommands } from "@/commands/command-repository";
import { PluginForm } from "@/components/plugins/plugin-form";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New plugin" };

export default async function NewPluginPage() {
  const { organizationId } = await requireWorkspaceSession();
  const commands = await listCommands(organizationId);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader eyebrow="Plugins" title="New plugin" />
      <PluginForm commands={commands} />
    </main>
  );
}
