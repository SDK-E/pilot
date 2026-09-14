import assert from "node:assert/strict";
import test from "node:test";

import { deriveConversationTitle } from "@/conversations/conversation-title";

test("a conversation title strips filler so the topic leads", () => {
  assert.equal(
    deriveConversationTitle(
      "Hey, could you please help me center a div in CSS?",
    ),
    "Center a div in CSS?",
  );
  assert.equal(
    deriveConversationTitle("Please write a haiku about autumn"),
    "Write a haiku about autumn",
  );
  assert.equal(
    deriveConversationTitle("Can you review this pull request"),
    "Review this pull request",
  );
});

test("a conversation title with no filler is capitalized as-is", () => {
  assert.equal(
    deriveConversationTitle("what's the capital of France?"),
    "What's the capital of France?",
  );
});

test("a long conversation title is truncated on a word boundary", () => {
  const title = deriveConversationTitle(
    "I need help with debugging a flaky test in our CI pipeline that fails intermittently",
  );
  assert.ok(title.length <= 60);
  assert.ok(title.endsWith("…"));
  assert.equal(title.includes("  "), false);
});
