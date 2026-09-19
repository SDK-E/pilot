import { notFound } from "next/navigation";
import { z } from "zod";

import { listCommands } from "@/commands/command-repository";
import { DeletePluginButton } from "@/components/plugins/delete-plugin-button";
import { PluginForm } from "@/components/plugins/plugin-form";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { getPlugin } from "@/plugins/plugin-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit plugin" };

export default async function PluginPage({
  params,
}: {
  params: Promise<{ pluginId: string }>;
}) {
  const { pluginId } = await params;
  if (!z.uuid().safeParse(pluginId).success) notFound();
  const { organizationId } = await requireWorkspaceSession();
  const [plugin, commands] = await Promise.all([
    getPlugin(organizationId, pluginId),
    listCommands(organizationId),
  ]);
  if (!plugin || plugin.archived) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader
        actions={<DeletePluginButton name={plugin.name} pluginId={plugin.id} />}
        eyebrow="Plugins"
        title={plugin.name}
      />
      <PluginForm commands={commands} plugin={plugin} />
    </main>
  );
}
