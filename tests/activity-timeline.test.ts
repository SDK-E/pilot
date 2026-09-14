import assert from "node:assert/strict";
import test from "node:test";

import {
  createSkillActivity,
  isSafeSkillId,
} from "@/executions/activity-event";
import {
  groupActivityTimeline,
  groupConsecutiveActivity,
} from "@/executions/activity-timeline";

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

  const [first, second] = runs;
  assert.ok(first);
  assert.ok(second);
  assert.deepEqual(
    first.events.map((event) => event.id),
    ["event-1", "event-2", "event-4"],
  );
  assert.equal(first.isComplete, true);
  assert.equal(second.isComplete, false);
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

  const [event] = run?.events ?? [];
  assert.ok(event);
  assert.equal(event.type, "skill.selected");
  assert.equal(event.summary.includes("Loaded"), true);
});
test("consecutive identical activity collapses into one entry with a count", () => {
  const grouped = groupConsecutiveActivity([
    {
      id: "event-1",
      executionId: "execution-a",
      summary: "Searching the web…",
      type: "tool.started",
    },
    {
      id: "event-2",
      executionId: "execution-a",
      summary: "Searching the web…",
      type: "tool.started",
    },
    {
      id: "event-3",
      executionId: "execution-a",
      summary: "Searching the web completed",
      type: "tool.completed",
    },
    {
      id: "event-4",
      executionId: "execution-a",
      summary: "Searching the web…",
      type: "tool.started",
    },
  ]);

  assert.deepEqual(
    grouped.map((step) => [step.summary, step.count]),
    [
      ["Searching the web…", 2],
      ["Searching the web completed", 1],
      ["Searching the web…", 1],
    ],
  );
});

test("runtime skills retain only a bounded safe display label", () => {
  assert.equal(isSafeSkillId("acme/research-helper"), true);
  assert.equal(isSafeSkillId("https://example.test/secret"), false);
  assert.equal(isSafeSkillId("skill with spaces"), false);
  assert.deepEqual(createSkillActivity({ skillId: "acme/research-helper" }), {
    type: "skill.selected",
    summary: "Loaded Research Helper skill",
  });
});
