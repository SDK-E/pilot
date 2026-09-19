import "server-only";

import {
  grantedToolIds,
  type AgentToolConfiguration,
} from "@/agents/agent-tools";

import type { ToolId } from "@/agents/agent-kinds";

export interface OrganizationCapabilities {
  webSearchEnabled: boolean;
  codeSandboxEnabled: boolean;
  /**
  Whether this org has at least one active, connected connector.
  */
  hasActiveCustomConnector: boolean;
}

export interface MessageToolOverrides {
  /**
   * The message's explicit connector on-set (the composer's per-message
   * toggle) — an array containing `"connector"` when on, `[]` when off.
   * `undefined` means the connector tool stays on whenever the org has one
   * connected — a connection's existence is itself the enablement signal.
   * Can never turn the tool on when the org has no connection.
   */
  requestedConnectorToolIds?: readonly string[];
  /**
   * Tool ids granted by the message's active skills, unioned into the
   * agent's own granted set before the usual org/connection filters run —
   * a skill can never bypass an org capability or an unconnected provider.
   */
  activeSkillToolIds?: readonly ToolId[];
  /**
   * Tool ids granted by the agent's granted plugins — unioned in the same
   * way as `activeSkillToolIds`, but standing rather than per-message (a
   * plugin grant works like `enabledToolIds` itself, not a composer
   * toggle). See `resolvePluginsToolIds`.
   */
  activePluginToolIds?: readonly ToolId[];
}

/**
 * Tools this organization lets the runtime register for the agent; pilot-ai
 * enforces its own copy of the web-search and code-sandbox flags too.
 */
export function allowedToolIds(
  agent: AgentToolConfiguration,
  capabilities: OrganizationCapabilities,
  overrides: MessageToolOverrides = {},
): ToolId[] {
  const granted = new Set(grantedToolIds(agent));
  const activeSkillToolIds = overrides.activeSkillToolIds ?? [];
  for (const toolId of activeSkillToolIds) granted.add(toolId);
  const activePluginToolIds = overrides.activePluginToolIds ?? [];
  for (const toolId of activePluginToolIds) granted.add(toolId);
  return [...granted].filter((toolId) => {
    if (toolId === "web-search") return capabilities.webSearchEnabled;
    if (toolId === "code-sandbox") return capabilities.codeSandboxEnabled;
    if (toolId === "connector") {
      if (!capabilities.hasActiveCustomConnector) return false;
      return (
        overrides.requestedConnectorToolIds === undefined ||
        overrides.requestedConnectorToolIds.includes("connector")
      );
    }
    return true;
  });
}

/**
Whether the connector tool could be used right now, no per-message override applied.
*/
export function isConnectorAvailable(
  agent: AgentToolConfiguration,
  capabilities: OrganizationCapabilities,
): boolean {
  return allowedToolIds(agent, capabilities).includes("connector");
}
