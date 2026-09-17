import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { skills } from "@/db/schema";

export interface SkillConfiguration {
  name: string;
  description: string;
  instructions: string;
  toolIds: string[];
}

const skillColumns = {
  id: skills.id,
  name: skills.name,
  description: skills.description,
  instructions: skills.instructions,
  toolIds: skills.toolIds,
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
