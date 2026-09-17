export type ActivityEventType =
  | "execution.started"
  | "execution.completed"
  | "execution.failed"
  | "skill.selected"
  | "tool.started"
  | "tool.completed"
  | "tool.failed";
export type ToolActivityState = "started" | "completed" | "failed";

// A run's start and finish are already conveyed by its own status label
// (e.g. "Response completed"), so UI step lists should skip these bookend
// events rather than repeat that as confusing extra steps.
export const EXECUTION_BOOKEND_TYPES: ActivityEventType[] = [
  "execution.started",
  "execution.completed",
  "execution.failed",
];

export const toolActivityToolIds = [
  "web-search",
  "langsearch",
  "browser",
  "file-analysis",
  "github",
  "scratchpad",
  "ask-user",
  "plan",
  "code-sandbox",
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
  const lastSegment = input.skillId.split("/").at(-1) ?? "";
  // A marketplace id often ends in a version, e.g. "web-search-instant-1.1.0";
  // strip it before formatting or "1.1.0" reads as three separate words.
  const withoutVersion = lastSegment.replace(/[._-]v?\d+(?:\.\d+)*$/i, "");
  const name = (withoutVersion || lastSegment)
    .replaceAll(/[._-]+/g, " ")
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
  plan: "Updating the plan",
  "code-sandbox": "Running code in the sandbox",
};

const toolStateSuffix: Record<ToolActivityState, string> = {
  started: "…",
  completed: " completed",
  failed: " failed",
};

/**
 * Converts a known capability identifier into the label persisted for a tool
 * event, plus an optional bounded `detail` — the real, formatted command/
 * output/results Pilot AI captured for that call, shown as an expandable
 * body under the label. `detail` is never present on a `started` event
 * (nothing has run yet) and is absent for tools with their own dedicated,
 * always-visible UI (ask-user, plan, scratchpad).
 */
export function createToolActivity(input: {
  toolId: ToolActivityToolId;
  toolCallId?: string;
  state: ToolActivityState;
  detail?: string;
}) {
  const label = toolLabels[input.toolId];
  return {
    type: `tool.${input.state}` as const,
    toolId: input.toolId,
    toolCallId: input.toolCallId,
    summary: `${label}${toolStateSuffix[input.state]}`,
    detail: input.detail,
  };
}
