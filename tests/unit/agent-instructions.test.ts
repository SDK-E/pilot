import assert from "node:assert/strict";
import test from "node:test";

import { buildAgentInstructions } from "@/agents/agent-instructions";

test("agent instructions include only configured settings", () => {
  assert.equal(
    buildAgentInstructions({
      instructions: "Investigate carefully.",
      goals: "Find primary sources.",
      tone: "Concise and direct.",
      outputFormat: "Markdown bullets.",
    }),
    "General instructions:\nInvestigate carefully.\n\nGoals:\nFind primary sources.\n\nTone:\nConcise and direct.\n\nOutput format:\nMarkdown bullets.",
  );
  assert.equal(
    buildAgentInstructions({
      instructions: "Answer clearly.",
      goals: "  ",
      tone: null,
      outputFormat: null,
    }),
    "General instructions:\nAnswer clearly.",
  );
});

test("agent instructions append the user's standing instructions last, when present", () => {
  assert.equal(
    buildAgentInstructions(
      {
        instructions: "Turn requests into a plan.",
        goals: null,
        tone: null,
        outputFormat: null,
      },
      "Always cite sources.",
    ),
    "General instructions:\nTurn requests into a plan.\n\nYour standing instructions from this user:\nAlways cite sources.",
  );
});

test("agent instructions omit the standing-instructions section when blank or absent", () => {
  assert.equal(
    buildAgentInstructions(
      {
        instructions: "Turn requests into a plan.",
        goals: null,
        tone: null,
        outputFormat: null,
      },
      " ".repeat(3),
    ),
    "General instructions:\nTurn requests into a plan.",
  );
  assert.equal(
    buildAgentInstructions({
      instructions: "Turn requests into a plan.",
      goals: null,
      tone: null,
      outputFormat: null,
    }),
    "General instructions:\nTurn requests into a plan.",
  );
});
