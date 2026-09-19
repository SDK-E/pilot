import { RiAddLine } from "@remixicon/react";
import Link from "next/link";

import { PluginCard } from "@/components/plugins/plugin-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { listPlugins } from "@/plugins/plugin-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Plugins" };

/**
 * Every organization plugin: a bundle of commands and/or tool grants an
 * agent can be granted, the same way a skill is granted.
 */
export default async function PluginsPage() {
  const { organizationId, membership } = await requireWorkspaceSession();
  const plugins = await listPlugins(organizationId);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <PageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/plugins/new">
              <RiAddLine aria-hidden="true" /> New plugin
            </Link>
          </Button>
        }
        description="Bundles of commands and tool grants an agent's settings can turn on."
        eyebrow={membership.organizationName}
        title="Plugins"
      />
      {plugins.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {plugins.map((plugin) => (
            <li key={plugin.id}>
              <PluginCard plugin={plugin} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No plugins yet</EmptyTitle>
            <EmptyDescription>
              Create one to make it available in an agent&apos;s settings.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  );
}
