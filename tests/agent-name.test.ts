import assert from "node:assert/strict";
import test from "node:test";

import { nextCopyName } from "@/agents/agent-name";

test("a duplicated agent gets the next free readable name", () => {
  const names = new Set(["Writer", "Copy of Writer"]);
  assert.equal(nextCopyName("Writer", names), "Copy of Writer (2)");
});

test("a generated copy name stays within the database limit", () => {
  const name = "R".repeat(100);
  assert.equal(nextCopyName(name, new Set())?.length, 100);
});
