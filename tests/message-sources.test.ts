import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeWebResponse } from "@/conversations/message-sources";

test("a web reply with pseudo tool calls is flagged and cleaned", () => {
  const result = sanitizeWebResponse(
    "webSearch> company facts\n<tool_call>fetch</tool_call>",
  );
  assert.equal(result.hasInvalidToolSyntax, true);
  assert.equal(result.text, "fetch");
});

test("only HTTP(S) URLs become message sources", () => {
  const result = sanitizeWebResponse(
    "Findings: [Official](https://example.com/docs) and ftp://example.org/x",
  );
  assert.equal(result.hasInvalidToolSyntax, false);
  assert.deepEqual(result.sources, [
    {
      title: "example.com",
      domain: "example.com",
      url: "https://example.com/docs",
      summary: "Source cited by Pilot.",
    },
  ]);
});
