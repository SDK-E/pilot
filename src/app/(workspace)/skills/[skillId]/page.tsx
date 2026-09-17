import { notFound } from "next/navigation";
import { z } from "zod";

import { DeleteSkillButton } from "@/components/skills/delete-skill-button";
import { SkillForm } from "@/components/skills/skill-form";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { getSkill } from "@/skills/skill-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit skill" };

export default async function SkillPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;
  if (!z.uuid().safeParse(skillId).success) notFound();
  const { organizationId } = await requireWorkspaceSession();
  const skill = await getSkill(organizationId, skillId);
  if (!skill || skill.archived) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader
        actions={<DeleteSkillButton name={skill.name} skillId={skill.id} />}
        eyebrow="Skills"
        title={skill.name}
      />
      <SkillForm skill={skill} />
    </main>
  );
}
