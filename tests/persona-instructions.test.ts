import assert from "node:assert/strict";
import test from "node:test";
import { buildPersonaInstructions } from "@/agents/persona-instructions";

test("persona instructions include only configured runtime settings", () => {
  assert.equal(
    buildPersonaInstructions({
      instructions: "Investigate carefully.",
      goals: "Find primary sources.",
      tone: "Concise and direct.",
      outputFormat: "Markdown bullets.",
    }),
    "General instructions:\nInvestigate carefully.\n\nGoals:\nFind primary sources.\n\nTone:\nConcise and direct.\n\nOutput format:\nMarkdown bullets.",
  );
  assert.equal(
    buildPersonaInstructions({
      instructions: "Answer clearly.",
      goals: "  ",
      tone: null,
      outputFormat: null,
    }),
    "General instructions:\nAnswer clearly.",
  );
});
