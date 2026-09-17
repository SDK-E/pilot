import { isToolId } from "@/agents/agent-kinds";

import type { ToolId } from "@/agents/agent-kinds";
import type { Skill } from "@/skills/skill-repository";

export interface AgentSkillConfiguration {
  enabledSkillIds: readonly string[];
}

/**
 * Skills an agent may use for a message: enabled on the agent and still a
 * real, non-archived skill in this organization. Mirrors `grantedToolIds`
 * in `agent-tools.ts`.
 */
export function grantedSkillIds(
  agent: AgentSkillConfiguration,
  organizationSkills: readonly Pick<Skill, "id">[],
): string[] {
  const validIds = new Set(organizationSkills.map((skill) => skill.id));
  return agent.enabledSkillIds.filter((skillId) => validIds.has(skillId));
}

/**
 * Tool ids granted by the given skills, deduplicated. Callers still run
 * these through `allowedToolIds` — a skill can never bypass an org
 * capability or an unconnected connector provider.
 */
export function resolveSkillsToolIds(
  activeSkillIds: readonly string[],
  organizationSkills: readonly Pick<Skill, "id" | "toolIds">[],
): ToolId[] {
  const active = new Set(activeSkillIds);
  const toolIds = new Set<ToolId>();
  for (const skill of organizationSkills) {
    if (!active.has(skill.id)) continue;
    for (const toolId of skill.toolIds) {
      if (isToolId(toolId)) toolIds.add(toolId);
    }
  }
  return [...toolIds];
}

/**
 * The extra system-prompt text contributed by the given skills, in a
 * stable order, joined for appending onto the agent's own instructions.
 */
export function resolveSkillsInstructions(
  activeSkillIds: readonly string[],
  organizationSkills: readonly Pick<Skill, "id" | "instructions">[],
): string {
  const active = new Set(activeSkillIds);
  return organizationSkills
    .filter((skill) => active.has(skill.id) && skill.instructions.trim())
    .map((skill) => skill.instructions.trim())
    .join("\n\n");
}
