import assert from "node:assert/strict";
import test from "node:test";
import { canUsePublicWebSearch } from "@/conversations/public-web-search-authorization";
import { isToolAvailableToBaseAgent } from "@/agents/agent-configuration";

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

test("only cataloged production capabilities are offered to a base agent", () => {
  assert.equal(
    isToolAvailableToBaseAgent("web-search", "conversational"),
    true,
  );
  assert.equal(isToolAvailableToBaseAgent("web-search", "research"), true);
  assert.equal(isToolAvailableToBaseAgent("browser", "research"), false);
});
