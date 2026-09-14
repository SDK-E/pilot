import {
  AGENT_KINDS,
  TOOL_IDS,
  type AgentKindId,
  type ToolId,
} from "./agent-kinds";

export const APPROVAL_MODES = ["ask", "allow", "deny"] as const;

type ApprovalMode = (typeof APPROVAL_MODES)[number];

export type ApprovalRules = Record<string, ApprovalMode>;

export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  /**
  Whether the tool can run without an approval decision.
  */
  approvable: boolean;
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
    approvable: true,
  },
  scratchpad: {
    id: "scratchpad",
    name: "Scratchpad",
    description:
      "Keep private working notes for one conversation. Never shared between chats.",
    approvable: true,
  },
  "ask-user": {
    id: "ask-user",
    name: "Ask you",
    description:
      "Pause and ask a focused question when the answer would change the result.",
    approvable: false,
  },
  plan: {
    id: "plan",
    name: "Plan",
    description:
      "Keep a visible, step-by-step task list for this conversation so progress stays transparent as the agent works.",
    approvable: false,
  },
  "code-sandbox": {
    id: "code-sandbox",
    name: "Code sandbox",
    description:
      "Run shell commands and scripts in a fresh, isolated sandbox with no access to Pilot's own systems or data, to actually execute and verify code instead of only describing it.",
    approvable: true,
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

/**
 * A new agent starts with every tool on, asking before the approvable ones.
 */
export function defaultApprovalRules(): ApprovalRules {
  return Object.fromEntries(TOOL_IDS.map((toolId) => [toolId, "ask"]));
}

export const defaultEnabledToolIds: readonly ToolId[] = TOOL_IDS;

export interface AgentToolConfiguration {
  baseAgentId: AgentKindId;
  enabledToolIds: readonly string[];
  approvalRules: Readonly<Record<string, string>>;
}

/**
 * Tools the runtime may register for this agent: enabled, allowed for its
 * kind, and not denied. `ask` tools run behind a durable approval.
 */
export function grantedToolIds(agent: AgentToolConfiguration): ToolId[] {
  return agent.enabledToolIds.filter(
    (toolId): toolId is ToolId =>
      isToolId(toolId) &&
      isToolAvailableTo(toolId, agent.baseAgentId) &&
      (agent.approvalRules[toolId] === "allow" ||
        agent.approvalRules[toolId] === "ask"),
  );
}

/**
 * Of the granted tools, those Pilot must pause on before they run.
 */
export function approvalRequiredToolIds(
  agent: AgentToolConfiguration,
  granted: readonly ToolId[],
): ToolId[] {
  return granted.filter(
    (toolId) =>
      TOOLS[toolId].approvable && agent.approvalRules[toolId] === "ask",
  );
}
