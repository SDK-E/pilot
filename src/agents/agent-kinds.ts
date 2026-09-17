/**
 * The three kinds of agent Pilot offers. Every configured agent is one of
 * these; the kind decides the mode of the product (Chat, Work, Code), the
 * default instructions, and which tools the agent may use at all.
 */
export const AGENT_KIND_IDS = ["chat", "work", "code"] as const;

export type AgentKindId = (typeof AGENT_KIND_IDS)[number];

export const TOOL_IDS = [
  "web-search",
  "scratchpad",
  "ask-user",
  "plan",
  "code-sandbox",
  "connector",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as readonly string[]).includes(value);
}

export interface AgentKind {
  id: AgentKindId;
  /**
  Product name of the mode: shown in navigation and headers.
  */
  name: string;
  /**
  One line under the name on the mode's start screen.
  */
  tagline: string;
  /**
  Composer placeholder on the mode's start screen.
  */
  placeholder: string;
  /**
  Suggested first messages, shown as chips under the composer.
  */
  suggestions: readonly string[];
  /**
  Name and instructions of the agent Pilot creates for a new organization.
  */
  defaultAgent: { name: string; instructions: string };
  /**
  Tools an agent of this kind may be granted.
  */
  tools: readonly ToolId[];
}

export const AGENT_KINDS: Record<AgentKindId, AgentKind> = {
  chat: {
    id: "chat",
    name: "Chat",
    tagline: "Ask anything, think out loud, get a clear answer.",
    placeholder: "Message Pilot…",
    suggestions: [
      "Explain a concept to me",
      "Summarize this text",
      "Help me draft a message",
    ],
    defaultAgent: {
      name: "Pilot Chat",
      instructions:
        "You are Pilot, a clear and practical assistant. Ask a concise follow-up question when it changes the answer, and state useful next steps.",
    },
    tools: TOOL_IDS,
  },
  work: {
    id: "work",
    name: "Work",
    tagline: "Hand Pilot a task. It plans and works through it end to end.",
    placeholder: "Describe the work to be done…",
    suggestions: [
      "Plan a project and break it into tasks",
      "Research a topic and give me sources",
      "Prepare a status update from these notes",
    ],
    defaultAgent: {
      name: "Pilot Work",
      instructions:
        "You are Pilot Work. Turn the request into a short plan, keep a visible step list, and execute it step by step with the tools you're granted.",
    },
    tools: TOOL_IDS,
  },
  code: {
    id: "code",
    name: "Code",
    tagline: "Read, explain, and propose code changes as reviewable diffs.",
    placeholder: "Describe the code you want to explore or change…",
    suggestions: [
      "Explain how this repository is structured",
      "Review this function for bugs",
      "Propose a diff for this change",
    ],
    defaultAgent: {
      name: "Pilot Code",
      instructions:
        "You are Pilot Code. Read before you change, keep diffs small and reviewable, explain trade-offs briefly, and never claim to have run code you did not run. When the sandbox tool is available, use it to actually run a script or test suite instead of predicting its output.",
    },
    tools: TOOL_IDS,
  },
};

export function isAgentKindId(value: unknown): value is AgentKindId {
  return (
    typeof value === "string" &&
    (AGENT_KIND_IDS as readonly string[]).includes(value)
  );
}

export function agentKind(id: AgentKindId): AgentKind {
  return AGENT_KINDS[id];
}

/**
The URL of a mode's start screen, or of one conversation inside it.
*/
export function modeHref(kind: AgentKindId, conversationId?: string): string {
  return conversationId ? `/${kind}/${conversationId}` : `/${kind}`;
}
