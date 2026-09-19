import { RiAddLine } from "@remixicon/react";
import Link from "next/link";

import { listCommands } from "@/commands/command-repository";
import { CommandCard } from "@/components/commands/command-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Commands" };

/**
 * Every organization command: a named, reusable prompt template the
 * composer's `/` palette can expand into the draft.
 */
export default async function CommandsPage() {
  const { organizationId, membership } = await requireWorkspaceSession();
  const commands = await listCommands(organizationId);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <PageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/commands/new">
              <RiAddLine aria-hidden="true" /> New command
            </Link>
          </Button>
        }
        description="Saved prompts any member can trigger from the composer's / palette."
        eyebrow={membership.organizationName}
        title="Commands"
      />
      {commands.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {commands.map((command) => (
            <li key={command.id}>
              <CommandCard command={command} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No commands yet</EmptyTitle>
            <EmptyDescription>
              Create one to make it available from the composer&apos;s{" "}
              <code>/</code> palette.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  );
}
