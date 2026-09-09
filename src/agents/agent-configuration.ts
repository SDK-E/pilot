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

export const approvalModes = [
  "ask",
  "allow",
  "deny",
  "auto-classifier",
] as const;
type ApprovalMode = (typeof approvalModes)[number];

export type ApprovalRules = Record<string, ApprovalMode>;
