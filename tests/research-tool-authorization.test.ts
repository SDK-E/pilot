import assert from "node:assert/strict";
import test from "node:test";
import { canUseResearchWebSearch } from "@/conversations/research-tool-authorization";

test("Research web search is offered only for allow or ask, never other rules", () => {
  for (const approval of [undefined, "deny", "auto-classifier"]) {
    assert.equal(
      canUseResearchWebSearch({
        baseAgentId: "research",
        enabledToolIds: ["web-search"],
        approvalRules: approval ? { "web-search": approval } : {},
      }),
      false,
    );
  }
  for (const approval of ["allow", "ask"]) {
    assert.equal(
      canUseResearchWebSearch({
        baseAgentId: "research",
        enabledToolIds: ["web-search"],
        approvalRules: { "web-search": approval },
      }),
      true,
    );
  }
  assert.equal(
    canUseResearchWebSearch({
      baseAgentId: "conversational",
      enabledToolIds: ["web-search"],
      approvalRules: { "web-search": "allow" },
    }),
    false,
  );
});
