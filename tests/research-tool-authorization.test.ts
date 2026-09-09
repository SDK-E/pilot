import assert from "node:assert/strict";
import test from "node:test";
import { canUseResearchWebSearch } from "@/conversations/research-tool-authorization";

test("Research web search requires an explicit allow rule", () => {
  for (const approval of [undefined, "ask", "deny", "auto-classifier"]) {
    assert.equal(
      canUseResearchWebSearch({
        baseAgentId: "research",
        enabledToolIds: ["web-search"],
        approvalRules: approval ? { "web-search": approval } : {},
      }),
      false,
    );
  }
  assert.equal(
    canUseResearchWebSearch({
      baseAgentId: "research",
      enabledToolIds: ["web-search"],
      approvalRules: { "web-search": "allow" },
    }),
    true,
  );
  assert.equal(
    canUseResearchWebSearch({
      baseAgentId: "conversational",
      enabledToolIds: ["web-search"],
      approvalRules: { "web-search": "allow" },
    }),
    false,
  );
});
