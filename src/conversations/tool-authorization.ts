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
 * The sandbox runs real, model-chosen commands billed to the team's Vercel
 * account, so — like web search — it stays opt-in per environment rather
 * than on by default the moment an agent enables it.
 */
function isCodeSandboxEnabled(): boolean {
  return process.env.PILOT_ENABLE_CODE_SANDBOX === "true";
}

/**
 * Tools this environment lets the runtime register for the agent.
 */
export function allowedToolIds(agent: AgentToolConfiguration): ToolId[] {
  const granted = grantedToolIds(agent);
  return granted.filter((toolId) => {
    if (toolId === "web-search") return isWebSearchEnabled();
    if (toolId === "code-sandbox") return isCodeSandboxEnabled();
    return true;
  });
}
