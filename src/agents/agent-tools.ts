import {
  AGENT_KINDS,
  TOOL_IDS,
  type AgentKindId,
  type ToolId,
} from "./agent-kinds";

export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
}

/**
 * The tools Pilot's runtime can grant. Each maps to a capability in pilot-ai.
 */
export const TOOLS: Record<ToolId, ToolDefinition> = {
  "web-search": {
    id: "web-search",
    name: "Web search",
    description:
      "Search and read public web pages, repositories, and sites through Pilot's protected runtime.",
  },
  scratchpad: {
    id: "scratchpad",
    name: "Scratchpad",
    description:
      "Keep private working notes for one conversation. Never shared between chats.",
  },
  "ask-user": {
    id: "ask-user",
    name: "Ask you",
    description:
      "Pause and ask a focused question when the answer would change the result.",
  },
  plan: {
    id: "plan",
    name: "Plan",
    description:
      "Keep a visible, step-by-step task list for this conversation so progress stays transparent as the agent works.",
  },
  "code-sandbox": {
    id: "code-sandbox",
    name: "Code sandbox",
    description:
      "Run shell commands and scripts in a fresh, isolated sandbox with no access to Pilot's own systems or data, to actually execute and verify code instead of only describing it.",
  },
};

function isToolId(value: unknown): value is ToolId {
  return (
    typeof value === "string" && (TOOL_IDS as readonly string[]).includes(value)
  );
}

export function isToolAvailableTo(toolId: ToolId, kind: AgentKindId): boolean {
  return AGENT_KINDS[kind].tools.includes(toolId);
}

export const defaultEnabledToolIds: readonly ToolId[] = TOOL_IDS;

export interface AgentToolConfiguration {
  baseAgentId: AgentKindId;
  enabledToolIds: readonly string[];
}

/**
 * Tools the runtime may register for this agent: enabled and allowed for
 * its kind. A granted tool just runs — no approval step.
 */
export function grantedToolIds(agent: AgentToolConfiguration): ToolId[] {
  return agent.enabledToolIds.filter(
    (toolId): toolId is ToolId =>
      isToolId(toolId) && isToolAvailableTo(toolId, agent.baseAgentId),
  );
}
