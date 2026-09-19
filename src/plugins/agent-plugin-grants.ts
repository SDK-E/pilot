import { isToolId } from "@/agents/agent-kinds";

import type { ToolId } from "@/agents/agent-kinds";
import type { Plugin } from "@/plugins/plugin-repository";

export interface AgentPluginConfiguration {
  enabledPluginIds: readonly string[];
}

/**
 * Plugins an agent may use: enabled on the agent and still a real,
 * non-archived plugin in this organization. Mirrors `grantedSkillIds`.
 */
export function grantedPluginIds(
  agent: AgentPluginConfiguration,
  organizationPlugins: readonly Pick<Plugin, "id">[],
): string[] {
  const validIds = new Set(organizationPlugins.map((plugin) => plugin.id));
  return agent.enabledPluginIds.filter((pluginId) => validIds.has(pluginId));
}

/**
 * Tool ids granted by the agent's granted plugins, deduplicated. Callers
 * still run these through `allowedToolIds` — a plugin can never bypass an
 * org capability or an unconnected connector provider. Unlike skills,
 * plugin tool grants are not toggled per message: a plugin is granted to
 * an agent the same standing way `enabledToolIds` itself is.
 */
export function resolvePluginsToolIds(
  grantedIds: readonly string[],
  organizationPlugins: readonly Pick<Plugin, "id" | "toolIds">[],
): ToolId[] {
  const granted = new Set(grantedIds);
  const toolIds = new Set<ToolId>();
  for (const plugin of organizationPlugins) {
    if (!granted.has(plugin.id)) continue;
    for (const toolId of plugin.toolIds) {
      if (isToolId(toolId)) toolIds.add(toolId);
    }
  }
  return [...toolIds];
}
