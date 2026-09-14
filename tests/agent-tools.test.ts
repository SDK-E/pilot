import assert from "node:assert/strict";
import test from "node:test";

import { AGENT_KIND_IDS, TOOL_IDS } from "@/agents/agent-kinds";
import {
  approvalRequiredToolIds,
  defaultApprovalRules,
  defaultEnabledToolIds,
  grantedToolIds,
  isToolAvailableTo,
} from "@/agents/agent-tools";

test("every kind may use web search, scratchpad, and ask-user", () => {
  for (const kind of AGENT_KIND_IDS) {
    for (const toolId of TOOL_IDS) {
      assert.equal(
        isToolAvailableTo(toolId, kind),
        true,
        `${toolId} for ${kind}`,
      );
    }
  }
});

test("a tool is granted only when enabled with an allow or ask rule", () => {
  const agent = {
    baseAgentId: "chat" as const,
    enabledToolIds: ["web-search", "scratchpad", "ask-user"],
    approvalRules: {
      "web-search": "allow",
      scratchpad: "deny",
      "ask-user": "ask",
    },
  };
  assert.deepEqual(grantedToolIds(agent), ["web-search", "ask-user"]);
  assert.deepEqual(
    grantedToolIds({ ...agent, enabledToolIds: ["scratchpad"] }),
    [],
  );
});

test("only approvable tools with an ask rule need an approval", () => {
  const agent = {
    baseAgentId: "work" as const,
    enabledToolIds: [...TOOL_IDS],
    approvalRules: {
      "web-search": "ask",
      scratchpad: "allow",
      "ask-user": "ask",
    },
  };
  const granted = grantedToolIds(agent);
  assert.deepEqual(granted, ["web-search", "scratchpad", "ask-user"]);
  assert.deepEqual(approvalRequiredToolIds(agent, granted), ["web-search"]);
});

test("a new agent starts with every tool on, asking first", () => {
  assert.deepEqual(defaultEnabledToolIds, [
    "web-search",
    "scratchpad",
    "ask-user",
  ]);
  assert.deepEqual(defaultApprovalRules(), {
    "web-search": "ask",
    scratchpad: "ask",
    "ask-user": "ask",
  });
});
