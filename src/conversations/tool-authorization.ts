import "server-only";

import {
  grantedToolIds,
  type AgentToolConfiguration,
} from "@/agents/agent-tools";

import type { ToolId } from "@/agents/agent-kinds";

/**
 * Public web search reaches the runtime only when this environment enables
 * it; pilot-ai enforces the same flag on its side.
 */
function isWebSearchEnabled(): boolean {
  return process.env.PILOT_ENABLE_WEB_SEARCH === "true";
}

/**
 * Tools this environment lets the runtime register for the agent.
 */
export function allowedToolIds(agent: AgentToolConfiguration): ToolId[] {
  const granted = grantedToolIds(agent);
  return isWebSearchEnabled()
    ? granted
    : granted.filter((toolId) => toolId !== "web-search");
}
