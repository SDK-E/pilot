import assert from "node:assert/strict";
import test from "node:test";
import { canUsePublicWebSearch } from "@/conversations/public-web-search-authorization";

test("public web search is offered to either agent only for allow or ask", () => {
  for (const approval of [undefined, "deny", "auto-classifier"]) {
    assert.equal(
      canUsePublicWebSearch({
        baseAgentId: "research",
        enabledToolIds: ["web-search"],
        approvalRules: approval ? { "web-search": approval } : {},
      }),
      false,
    );
  }
  for (const approval of ["allow", "ask"]) {
    assert.equal(
      canUsePublicWebSearch({
        baseAgentId: "research",
        enabledToolIds: ["web-search"],
        approvalRules: { "web-search": approval },
      }),
      true,
    );
  }
  for (const baseAgentId of ["conversational", "research"] as const) {
    assert.equal(
      canUsePublicWebSearch({
        baseAgentId,
        enabledToolIds: ["web-search"],
        approvalRules: { "web-search": "allow" },
      }),
      true,
    );
  }
});
