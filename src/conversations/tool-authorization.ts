import "server-only";

import {
  grantedToolIds,
  type AgentToolConfiguration,
} from "@/agents/agent-tools";
import {
  isConnectorToolId,
  TOOL_ID_PROVIDER,
  type ConnectorProviderId,
} from "@/connectors/connector-providers";

import type { ToolId } from "@/agents/agent-kinds";

export interface OrganizationCapabilities {
  webSearchEnabled: boolean;
  codeSandboxEnabled: boolean;
  /**
   * Connector providers with at least one active connection (personal or
   * organization) visible to the requesting user — see
   * `getAvailableConnectorProviders`.
   */
  availableConnectorProviders: ReadonlySet<ConnectorProviderId>;
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
    if (isConnectorToolId(toolId)) {
      return capabilities.availableConnectorProviders.has(
        TOOL_ID_PROVIDER[toolId],
      );
    }
    return true;
  });
}
