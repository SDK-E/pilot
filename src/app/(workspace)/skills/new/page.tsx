import { SkillForm } from "@/components/skills/skill-form";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New skill" };

export default async function NewSkillPage() {
  await requireWorkspaceSession();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader eyebrow="Skills" title="New skill" />
      <SkillForm />
    </main>
  );
}
