import assert from "node:assert/strict";
import test from "node:test";

import { AGENT_KIND_IDS, TOOL_IDS } from "@/agents/agent-kinds";
import {
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

test("a tool is granted only when enabled and allowed for the kind", () => {
  const agent = {
    baseAgentId: "chat" as const,
    enabledToolIds: ["web-search", "scratchpad", "ask-user"],
  };
  assert.deepEqual(grantedToolIds(agent), [
    "web-search",
    "scratchpad",
    "ask-user",
  ]);
  assert.deepEqual(
    grantedToolIds({ ...agent, enabledToolIds: ["scratchpad"] }),
    ["scratchpad"],
  );
});

test("a new agent starts with every tool on", () => {
  assert.deepEqual(defaultEnabledToolIds, TOOL_IDS);
});
