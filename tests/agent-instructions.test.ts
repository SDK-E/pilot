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
