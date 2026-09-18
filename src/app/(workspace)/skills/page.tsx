import { RiAddLine, RiStoreLine } from "@remixicon/react";
import Link from "next/link";

import { SkillCard } from "@/components/skills/skill-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { listSkills } from "@/skills/skill-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Skills" };

/**
 * Every organization skill: a named bundle of extra instructions and tool
 * grants a user can enable on an agent, or select for one message from the
 * composer's skills picker.
 */
export default async function SkillsPage() {
  const { organizationId, membership } = await requireWorkspaceSession();
  const skills = await listSkills(organizationId);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <PageHeader
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/skills/marketplace">
                <RiStoreLine aria-hidden="true" /> Browse marketplace
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/skills/new">
                <RiAddLine aria-hidden="true" /> New skill
              </Link>
            </Button>
          </>
        }
        description="Reusable instructions and tool grants agents and messages can turn on."
        eyebrow={membership.organizationName}
        title="Skills"
      />
      {skills.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {skills.map((skill) => (
            <li key={skill.id}>
              <SkillCard skill={skill} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No skills yet</EmptyTitle>
            <EmptyDescription>
              Create one to make it available in an agent&apos;s settings and
              the composer&apos;s skills picker.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  );
}
