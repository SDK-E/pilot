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
    "connector-github",
    "connector-gmail",
  ],
};

test("web-search and code-sandbox are gated by the org capability flags", () => {
  assert.deepEqual(
    allowedToolIds(agent, {
      webSearchEnabled: false,
      codeSandboxEnabled: false,
      availableConnectorProviders: new Set(),
    }),
    ["scratchpad", "ask-user"],
  );
  assert.deepEqual(
    allowedToolIds(agent, {
      webSearchEnabled: true,
      codeSandboxEnabled: true,
      availableConnectorProviders: new Set(),
    }),
    ["web-search", "scratchpad", "ask-user", "code-sandbox"],
  );
});

test("a connector tool is granted only when its provider has an available connection", () => {
  const withoutConnections = allowedToolIds(agent, {
    webSearchEnabled: false,
    codeSandboxEnabled: false,
    availableConnectorProviders: new Set(),
  });
  assert.ok(!withoutConnections.includes("connector-github"));
  assert.ok(!withoutConnections.includes("connector-gmail"));

  const withGithubOnly = allowedToolIds(agent, {
    webSearchEnabled: false,
    codeSandboxEnabled: false,
    availableConnectorProviders: new Set(["github"]),
  });
  assert.ok(withGithubOnly.includes("connector-github"));
  assert.ok(!withGithubOnly.includes("connector-gmail"));

  const withBoth = allowedToolIds(agent, {
    webSearchEnabled: false,
    codeSandboxEnabled: false,
    availableConnectorProviders: new Set(["github", "google"]),
  });
  assert.ok(withBoth.includes("connector-github"));
  assert.ok(withBoth.includes("connector-gmail"));
});

test("gmail and google-drive both key off the shared google provider connection", () => {
  const agentWithBothGoogleTools: AgentToolConfiguration = {
    baseAgentId: "work",
    enabledToolIds: ["connector-gmail", "connector-google-drive"],
  };
  const granted = allowedToolIds(agentWithBothGoogleTools, {
    webSearchEnabled: false,
    codeSandboxEnabled: false,
    availableConnectorProviders: new Set(["google"]),
  });
  assert.deepEqual(
    new Set(granted),
    new Set(["connector-gmail", "connector-google-drive"]),
  );
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
      availableConnectorProviders: new Set(),
    }),
    ["plan"],
  );
});
