export type ActivityEventType =
  | "execution.started"
  | "execution.completed"
  | "execution.failed"
  | "skill.selected"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "tool.awaiting_approval";
export type ToolActivityState =
  "started" | "completed" | "failed" | "awaiting_approval";

export const toolActivityToolIds = [
  "web-search",
  "langsearch",
  "browser",
  "file-analysis",
  "github",
  "scratchpad",
  "ask-user",
] as const;

type ToolActivityToolId = (typeof toolActivityToolIds)[number];

const skillIdPattern = /^[a-z0-9][a-z0-9._/-]{0,120}$/i;

export function isSafeSkillId(value: unknown): value is string {
  return typeof value === "string" && skillIdPattern.test(value);
}

/**
 * Stores a human-readable skill selection without retaining the discovery
 * query, downloaded instructions, source, or audit details.
 */
export function createSkillActivity(input: { skillId: string }) {
  if (!isSafeSkillId(input.skillId)) {
    throw new Error("Invalid runtime skill identifier.");
  }
  const name = input.skillId
    .split("/")
    .at(-1)
    ?.replaceAll(/[._-]+/g, " ")
    .replaceAll(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 80);
  return {
    type: "skill.selected" as const,
    summary: name ? `Loaded ${name} skill` : "Loaded a relevant skill",
  };
}

const toolLabels: Record<ToolActivityToolId, string> = {
  "web-search": "Searching the web",
  langsearch: "Searching the web",
  browser: "Using the browser",
  "file-analysis": "Analyzing a file",
  github: "Using GitHub",
  scratchpad: "Updating the scratchpad",
  "ask-user": "Waiting for your input",
};

const toolStateSuffix: Record<ToolActivityState, string> = {
  started: "…",
  completed: " completed",
  awaiting_approval: " needs approval",
  failed: " failed",
};

/**
 * Converts a known capability identifier into the only detail persisted for a
 * tool event. Model-provided input, output, URLs, prompts, and errors are not
 * eligible for this audit trail.
 */
export function createToolActivity(input: {
  toolId: ToolActivityToolId;
  toolCallId?: string;
  state: ToolActivityState;
}) {
  const label = toolLabels[input.toolId];
  return {
    type: `tool.${input.state}` as const,
    toolId: input.toolId,
    toolCallId: input.toolCallId,
    summary: `${label}${toolStateSuffix[input.state]}`,
  };
}
