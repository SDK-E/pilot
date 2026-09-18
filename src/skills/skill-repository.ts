import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { skills } from "@/db/schema";

export interface SkillConfiguration {
  name: string;
  description: string;
  instructions: string;
  toolIds: string[];
  /**
  Set only when installing from the marketplace — see skills.ts's schema comment.
  */
  marketplaceId?: string;
  marketplaceUrl?: string;
}

const skillColumns = {
  id: skills.id,
  name: skills.name,
  description: skills.description,
  instructions: skills.instructions,
  toolIds: skills.toolIds,
  marketplaceId: skills.marketplaceId,
  marketplaceUrl: skills.marketplaceUrl,
  archived: skills.archived,
  createdAt: skills.createdAt,
  updatedAt: skills.updatedAt,
};

export type Skill = Awaited<ReturnType<typeof listSkills>>[number];

export async function createSkill(
  organizationId: string,
  createdByWorkosUserId: string,
  skill: SkillConfiguration,
) {
  const [created] = await db
    .insert(skills)
    .values({ ...skill, organizationId, createdByWorkosUserId })
    .returning(skillColumns);
  return created;
}

export async function updateSkill(
  organizationId: string,
  skillId: string,
  skill: SkillConfiguration,
) {
  const [updated] = await db
    .update(skills)
    .set({ ...skill, updatedAt: new Date() })
    .where(
      and(eq(skills.organizationId, organizationId), eq(skills.id, skillId)),
    )
    .returning(skillColumns);
  return updated;
}

export async function archiveSkill(organizationId: string, skillId: string) {
  const [archived] = await db
    .update(skills)
    .set({ archived: true, updatedAt: new Date() })
    .where(
      and(eq(skills.organizationId, organizationId), eq(skills.id, skillId)),
    )
    .returning({ id: skills.id });
  return archived;
}

export function listSkills(organizationId: string) {
  return db
    .select(skillColumns)
    .from(skills)
    .where(
      and(
        eq(skills.organizationId, organizationId),
        eq(skills.archived, false),
      ),
    )
    .orderBy(desc(skills.createdAt));
}

/**
 * Installs (or re-installs) a marketplace skill: creates the org's skill
 * row, or updates the existing one for this exact `marketplaceId` in place
 * if the skill was already installed before — including un-archiving it, so
 * re-adding a skill someone deleted brings it back instead of erroring on
 * the unique constraint. Tool grants are never touched by a re-install; an
 * admin's own choices there are local to this organization and outlive
 * whatever the upstream skill ships.
 */
export async function upsertMarketplaceSkill(
  organizationId: string,
  createdByWorkosUserId: string,
  skill: Required<
    Pick<SkillConfiguration, "marketplaceId" | "marketplaceUrl">
  > &
    Omit<SkillConfiguration, "toolIds" | "marketplaceId" | "marketplaceUrl">,
) {
  const [installed] = await db
    .insert(skills)
    .values({
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
      marketplaceId: skill.marketplaceId,
      marketplaceUrl: skill.marketplaceUrl,
      organizationId,
      createdByWorkosUserId,
    })
    .onConflictDoUpdate({
      target: [skills.organizationId, skills.marketplaceId],
      set: {
        name: skill.name,
        description: skill.description,
        instructions: skill.instructions,
        marketplaceUrl: skill.marketplaceUrl,
        archived: false,
        updatedAt: new Date(),
      },
    })
    .returning(skillColumns);
  return installed;
}

export async function getSkill(organizationId: string, skillId: string) {
  const [skill] = await db
    .select(skillColumns)
    .from(skills)
    .where(
      and(eq(skills.organizationId, organizationId), eq(skills.id, skillId)),
    )
    .limit(1);
  return skill;
}
