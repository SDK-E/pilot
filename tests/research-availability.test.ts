import assert from "node:assert/strict";
import test from "node:test";
import { isResearchAvailable } from "@/conversations/research-availability";

test("Research requires the environment capability flag", () => {
  const original = process.env.PILOT_RESEARCH_ENABLED;
  try {
    delete process.env.PILOT_RESEARCH_ENABLED;
    assert.equal(isResearchAvailable("conversational"), true);
    assert.equal(isResearchAvailable("research"), false);

    process.env.PILOT_RESEARCH_ENABLED = "true";
    assert.equal(isResearchAvailable("research"), true);
  } finally {
    if (original === undefined) delete process.env.PILOT_RESEARCH_ENABLED;
    else process.env.PILOT_RESEARCH_ENABLED = original;
  }
});
