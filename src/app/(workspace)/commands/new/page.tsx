import { CommandForm } from "@/components/commands/command-form";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New command" };

export default async function NewCommandPage() {
  await requireWorkspaceSession();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader eyebrow="Commands" title="New command" />
      <CommandForm />
    </main>
  );
}
