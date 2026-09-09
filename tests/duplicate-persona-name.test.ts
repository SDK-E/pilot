import assert from "node:assert/strict";
import test from "node:test";
import { nextDuplicatePersonaName } from "@/workers/duplicate-persona-name";

test("persona duplication uses a readable available name", () => {
  const names = new Set(["Research", "Copy of Research"]);
  assert.equal(
    nextDuplicatePersonaName("Research", names),
    "Copy of Research (2)",
  );
});

test("persona duplication keeps a generated name within the database limit", () => {
  const name = "R".repeat(100);
  assert.equal(nextDuplicatePersonaName(name, new Set())?.length, 100);
});
