import assert from "node:assert/strict";
import test from "node:test";

import { allowedToolIds } from "@/conversations/tool-authorization";

import type { AgentToolConfiguration } from "@/agents/agent-tools";

const agent: AgentToolConfiguration = {
  baseAgentId: "chat",
  enabledToolIds: [
    "web-search",
    "scratchpad",
    "ask-user",
    "code-sandbox",
    "connector",
  ],
};

test("web-search and code-sandbox are gated by the org capability flags", () => {
  assert.deepEqual(
    allowedToolIds(agent, {
      webSearchEnabled: false,
      codeSandboxEnabled: false,
      hasActiveCustomConnector: false,
    }),
    ["scratchpad", "ask-user"],
  );
  assert.deepEqual(
    allowedToolIds(agent, {
      webSearchEnabled: true,
      codeSandboxEnabled: true,
      hasActiveCustomConnector: false,
    }),
    ["web-search", "scratchpad", "ask-user", "code-sandbox"],
  );
});

test("the connector tool is granted only when the org has an active connection", () => {
  const withoutConnections = allowedToolIds(agent, {
    webSearchEnabled: false,
    codeSandboxEnabled: false,
    hasActiveCustomConnector: false,
  });
  assert.ok(!withoutConnections.includes("connector"));

  const withConnection = allowedToolIds(agent, {
    webSearchEnabled: false,
    codeSandboxEnabled: false,
    hasActiveCustomConnector: true,
  });
  assert.ok(withConnection.includes("connector"));
});

test("plan is never gated by an org capability or connector availability", () => {
  const agentWithPlan: AgentToolConfiguration = {
    baseAgentId: "code",
    enabledToolIds: ["plan"],
  };
  assert.deepEqual(
    allowedToolIds(agentWithPlan, {
      webSearchEnabled: false,
      codeSandboxEnabled: false,
      hasActiveCustomConnector: false,
    }),
    ["plan"],
  );
});

test("omitting requestedConnectorToolIds keeps the connector on when connected", () => {
  const granted = allowedToolIds(agent, {
    webSearchEnabled: false,
    codeSandboxEnabled: false,
    hasActiveCustomConnector: true,
  });
  assert.ok(granted.includes("connector"));
});

test("an explicit empty requestedConnectorToolIds turns the connector off for this message", () => {
  const turnedOff = allowedToolIds(
    agent,
    {
      webSearchEnabled: false,
      codeSandboxEnabled: false,
      hasActiveCustomConnector: true,
    },
    { requestedConnectorToolIds: [] },
  );
  assert.ok(!turnedOff.includes("connector"));

  // Requesting the connector when the org has no connection still excludes
  // it — the message-level toggle can only narrow an already-legitimate grant.
  const cannotWiden = allowedToolIds(
    agent,
    {
      webSearchEnabled: false,
      codeSandboxEnabled: false,
      hasActiveCustomConnector: false,
    },
    { requestedConnectorToolIds: ["connector"] },
  );
  assert.ok(!cannotWiden.includes("connector"));
});

test("activeSkillToolIds are unioned in before the usual filters run", () => {
  const agentWithNoTools: AgentToolConfiguration = {
    baseAgentId: "chat",
    enabledToolIds: [],
  };
  const withSkillTool = allowedToolIds(
    agentWithNoTools,
    {
      webSearchEnabled: false,
      codeSandboxEnabled: false,
      hasActiveCustomConnector: true,
    },
    { activeSkillToolIds: ["connector"] },
  );
  assert.deepEqual(withSkillTool, ["connector"]);

  // A skill can't bypass an org capability or an unconnected connector.
  const skillCannotBypassCapability = allowedToolIds(
    agentWithNoTools,
    {
      webSearchEnabled: false,
      codeSandboxEnabled: false,
      hasActiveCustomConnector: false,
    },
    { activeSkillToolIds: ["web-search", "connector"] },
  );
  assert.deepEqual(skillCannotBypassCapability, []);
});
