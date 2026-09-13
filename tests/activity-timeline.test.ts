import assert from "node:assert/strict";
import test from "node:test";
import { groupActivityTimeline } from "@/executions/activity-timeline";

test("activity timeline keeps intermediate steps grouped by response run", () => {
  const runs = groupActivityTimeline([
    {
      id: "event-1",
      executionId: "execution-a",
      summary: "Generating a response",
      type: "execution.started",
    },
    {
      id: "event-2",
      executionId: "execution-a",
      summary: "Searching the web…",
      type: "tool.started",
    },
    {
      id: "event-3",
      executionId: "execution-b",
      summary: "Generating a response",
      type: "execution.started",
    },
    {
      id: "event-4",
      executionId: "execution-a",
      summary: "Response completed",
      type: "execution.completed",
    },
  ]);

  assert.equal(runs.length, 2);
  assert.deepEqual(
    runs[0]?.events.map((event) => event.id),
    ["event-1", "event-2", "event-4"],
  );
  assert.equal(runs[0]?.isComplete, true);
  assert.equal(runs[1]?.isComplete, false);
});

test("activity timeline retains safe selected-skill milestones", () => {
  const [run] = groupActivityTimeline([
    {
      id: "event-1",
      executionId: "execution-a",
      summary: "Loaded Research Helper skill",
      type: "skill.selected",
    },
  ]);

  assert.equal(run?.events[0]?.type, "skill.selected");
  assert.equal(run?.events[0]?.summary.includes("Loaded"), true);
});
import {
  createSkillActivity,
  isSafeSkillId,
} from "@/executions/activity-event";

test("runtime skills retain only a bounded safe display label", () => {
  assert.equal(isSafeSkillId("acme/research-helper"), true);
  assert.equal(isSafeSkillId("https://example.test/secret"), false);
  assert.equal(isSafeSkillId("skill with spaces"), false);
  assert.deepEqual(createSkillActivity({ skillId: "acme/research-helper" }), {
    type: "skill.selected",
    summary: "Loaded Research Helper skill",
  });
});
