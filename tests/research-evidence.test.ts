import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeResearchText } from "@/conversations/research-evidence";

test("research transcript rejects pseudo tool calls and does not retain them", () => {
  const result = sanitizeResearchText(
    "webSearch> company research\n<tool_call>fetch</tool_call>",
  );
  assert.equal(result.invalidToolSyntax, true);
  assert.equal(result.text, "fetch");
});

test("research transcript records only HTTP source evidence", () => {
  const result = sanitizeResearchText(
    "Findings: [Official](https://example.com/docs)",
  );
  assert.equal(result.invalidToolSyntax, false);
  assert.deepEqual(result.sources, [
    {
      title: "example.com",
      domain: "example.com",
      url: "https://example.com/docs",
      summary: "Source cited by Pilot.",
    },
  ]);
});
