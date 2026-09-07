export const baseAgents = [
  {
    id: "conversational",
    name: "Conversational",
    description: "General-purpose chat with no production tools yet.",
    available: true,
  },
  {
    id: "research",
    name: "Research",
    description:
      "Research with protected tools. It is unavailable until its production capability boundary is verified.",
    available: false,
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

export const approvalModes = [
  "ask",
  "allow",
  "deny",
  "auto-classifier",
] as const;
type ApprovalMode = (typeof approvalModes)[number];

export type ApprovalRules = Record<string, ApprovalMode>;
