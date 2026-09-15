import assert from "node:assert/strict";
import test from "node:test";

import { buildContinuationPrompt } from "@/conversations/continuation-prompt";

test("a continuation prompt carries the full partial reply when it is short", () => {
  const prompt = buildContinuationPrompt("Paris is the capital of");
  assert.equal(prompt.includes("Paris is the capital of"), true);
  assert.equal(prompt.includes("cut off partway through"), true);
});

test("a long partial reply is bounded to its tail, not its start", () => {
  const partial = `START-MARKER${"x".repeat(7000)}END-MARKER`;
  const prompt = buildContinuationPrompt(partial);
  assert.equal(prompt.includes("START-MARKER"), false);
  assert.equal(prompt.includes("END-MARKER"), true);
  assert.equal(prompt.includes("earlier part omitted"), true);
});

test("surrounding whitespace on the partial reply is trimmed", () => {
  const prompt = buildContinuationPrompt("  Tokyo is  \n\n");
  assert.equal(prompt.endsWith("Tokyo is"), true);
});
