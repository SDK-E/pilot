import assert from "node:assert/strict";
import test from "node:test";

// BLOCKED: @pilot/conversation-contracts is not yet published.
// This test documents the cross-repo consumption dependency.
// Remove the BLOCKED marker and unskip when ADR 0013 publication is resolved.
test("contract-import (BLOCKED): pilot consumes GenerateConversationReply from @pilot/conversation-contracts", () => {
  assert.fail("BLOCKED: @pilot/conversation-contracts not published");
});
