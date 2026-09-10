export const baseAgents = [
  {
    id: "conversational",
    name: "Conversational",
    description:
      "General-purpose chat with optional protected public-web search.",
    available: true,
  },
  {
    id: "research",
    name: "Research",
    description:
      "Public-web research with a protected read-only search boundary.",
    available: true,
  },
] as const;

export const baseAgentIds = baseAgents.map((agent) => agent.id);
export type BaseAgentId = (typeof baseAgents)[number]["id"];

export const configurableToolIds = [
  "web-search",
  "langsearch",
  "browser",
  "file-analysis",
  "github",
  "scratchpad",
  "ask-user",
] as const;

export type ConfigurableToolId = (typeof configurableToolIds)[number];

export const toolCapabilities = [
  {
    id: "web-search",
    name: "Public web research",
    description:
      "Search and read public sources with LangSearch through Pilot's protected runtime.",
    availableFor: ["conversational", "research"],
  },
  {
    id: "scratchpad",
    name: "Scratchpad",
    description:
      "Read and update a private, chat-scoped working scratchpad through Pilot's protected runtime.",
    availableFor: ["conversational", "research"],
  },
  {
    id: "ask-user",
    name: "Ask user",
    description:
      "Ask a focused follow-up question in the chat when an answer would materially change the result.",
    availableFor: ["conversational", "research"],
  },
  {
    id: "langsearch",
    name: "LangSearch",
    description:
      "Reserved for a separately authorized source-search capability.",
    availableFor: [],
  },
  {
    id: "browser",
    name: "Browser actions",
    description: "Requires a visible, approval-gated browser session.",
    availableFor: [],
  },
  {
    id: "file-analysis",
    name: "File analysis",
    description:
      "Requires authorized upload, storage, retrieval, and deletion behavior.",
    availableFor: [],
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Requires a user-authorized MCP connection and scoped access controls.",
    availableFor: [],
  },
] as const satisfies ReadonlyArray<{
  id: ConfigurableToolId;
  name: string;
  description: string;
  availableFor: readonly BaseAgentId[];
}>;

/**
 * A new persona begins with the only production tool that both bases can
 * invoke. The UI keeps this as an ordinary checkbox, so a creator can remove
 * it before saving. Other capabilities remain unavailable until Pilot has a
 * complete authorization, approval, activity, and storage boundary for them.
 */
export const defaultEnabledToolIds: readonly ConfigurableToolId[] = [
  "web-search",
  "scratchpad",
  "ask-user",
];

/**
 * Built-in Pilot personas begin with every production-ready shared capability
 * enabled. External-state tools still require a durable, user-visible
 * approval by default; Ask User remains an in-chat suspension.
 */
export function defaultToolApprovalRules(): ApprovalRules {
  return Object.fromEntries(
    defaultEnabledToolIds.map((toolId) => [toolId, "ask"]),
  ) as ApprovalRules;
}

export function isToolAvailableToBaseAgent(
  toolId: ConfigurableToolId,
  baseAgentId: BaseAgentId,
) {
  const tool = toolCapabilities.find((candidate) => candidate.id === toolId) as
    { availableFor: readonly BaseAgentId[] } | undefined;
  return tool?.availableFor.includes(baseAgentId) ?? false;
}

export const approvalModes = [
  "ask",
  "allow",
  "deny",
  "auto-classifier",
] as const;
type ApprovalMode = (typeof approvalModes)[number];

export type ApprovalRules = Record<string, ApprovalMode>;
