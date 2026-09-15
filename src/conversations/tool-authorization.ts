import "server-only";

import {
  grantedToolIds,
  type AgentToolConfiguration,
} from "@/agents/agent-tools";

import type { ToolId } from "@/agents/agent-kinds";

export interface OrganizationCapabilities {
  webSearchEnabled: boolean;
  codeSandboxEnabled: boolean;
}

/**
 * Tools this organization lets the runtime register for the agent; pilot-ai
 * enforces its own copy of the web-search and code-sandbox flags too.
 */
export function allowedToolIds(
  agent: AgentToolConfiguration,
  capabilities: OrganizationCapabilities,
): ToolId[] {
  const granted = grantedToolIds(agent);
  return granted.filter((toolId) => {
    if (toolId === "web-search") return capabilities.webSearchEnabled;
    if (toolId === "code-sandbox") return capabilities.codeSandboxEnabled;
    return true;
  });
}
