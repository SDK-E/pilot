import { notFound } from "next/navigation";
import { z } from "zod";

import { getCommand } from "@/commands/command-repository";
import { CommandForm } from "@/components/commands/command-form";
import { DeleteCommandButton } from "@/components/commands/delete-command-button";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit command" };

export default async function CommandPage({
  params,
}: {
  params: Promise<{ commandId: string }>;
}) {
  const { commandId } = await params;
  if (!z.uuid().safeParse(commandId).success) notFound();
  const { organizationId } = await requireWorkspaceSession();
  const command = await getCommand(organizationId, commandId);
  if (!command || command.archived) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader
        actions={
          <DeleteCommandButton commandId={command.id} name={command.name} />
        }
        eyebrow="Commands"
        title={`/${command.name}`}
      />
      <CommandForm command={command} />
    </main>
  );
}
