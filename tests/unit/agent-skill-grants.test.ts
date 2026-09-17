import assert from "node:assert/strict";
import test from "node:test";

import {
  grantedSkillIds,
  resolveSkillsInstructions,
  resolveSkillsToolIds,
} from "@/skills/agent-skill-grants";

const organizationSkills = [
  {
    id: "skill-research",
    toolIds: ["web-search", "connector"],
    instructions: "Cite every claim with a source link.",
  },
  {
    id: "skill-french",
    toolIds: [],
    instructions: "Always answer in French.",
  },
];

test("a skill is granted only when enabled on the agent and still real", () => {
  assert.deepEqual(
    grantedSkillIds({ enabledSkillIds: ["skill-research", "skill-deleted"] }, [
      { id: "skill-research" },
      { id: "skill-french" },
    ]),
    ["skill-research"],
  );
});

test("resolveSkillsToolIds unions tool ids from the active skills only", () => {
  assert.deepEqual(
    new Set(resolveSkillsToolIds(["skill-research"], organizationSkills)),
    new Set(["web-search", "connector"]),
  );
  assert.deepEqual(
    resolveSkillsToolIds(["skill-french"], organizationSkills),
    [],
  );
  assert.deepEqual(resolveSkillsToolIds([], organizationSkills), []);
});

test("resolveSkillsInstructions joins only the active skills' instructions", () => {
  assert.equal(
    resolveSkillsInstructions(["skill-french"], organizationSkills),
    "Always answer in French.",
  );
  assert.equal(
    resolveSkillsInstructions(
      ["skill-research", "skill-french"],
      organizationSkills,
    ),
    "Cite every claim with a source link.\n\nAlways answer in French.",
  );
  assert.equal(resolveSkillsInstructions([], organizationSkills), "");
});
