import assert from "node:assert/strict";
import test from "node:test";
import { canUsePublicWebSearch } from "@/conversations/public-web-search-authorization";
import {
  defaultEnabledToolIds,
  isToolAvailableToBaseAgent,
  toolCapabilities,
} from "@/agents/agent-configuration";
import { allowedProductionToolIds } from "@/conversations/tool-authorization";

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
  assert.equal(isToolAvailableToBaseAgent("scratchpad", "research"), true);
  assert.equal(isToolAvailableToBaseAgent("ask-user", "research"), true);
  assert.equal(isToolAvailableToBaseAgent("browser", "research"), false);
});

test("production tools require both an enabled capability and allow or ask", () => {
  assert.deepEqual(
    allowedProductionToolIds({
      baseAgentId: "conversational",
      enabledToolIds: ["web-search", "scratchpad", "ask-user"],
      approvalRules: {
        "web-search": "allow",
        scratchpad: "ask",
        "ask-user": "ask",
      },
    }),
    ["web-search", "scratchpad", "ask-user"],
  );
  assert.deepEqual(
    allowedProductionToolIds({
      baseAgentId: "research",
      enabledToolIds: ["scratchpad"],
      approvalRules: { scratchpad: "deny" },
    }),
    [],
  );
});

test("new personas start with the production tool baseline selected", () => {
  assert.deepEqual(defaultEnabledToolIds, [
    "web-search",
    "scratchpad",
    "ask-user",
  ]);
});

test("the persona tool catalog has no duplicate capabilities", () => {
  const toolIds = toolCapabilities.map((tool) => tool.id);
  assert.equal(new Set(toolIds).size, toolIds.length);
});
