export type ActivityEventType =
  | "execution.started"
  | "execution.completed"
  | "execution.failed"
  | "tool.started"
  | "tool.completed"
  | "tool.failed";
export type ToolActivityState = "started" | "completed" | "failed";

const toolLabels = {
  "web-search": "Searching the web",
  langsearch: "Searching the web",
  browser: "Using the browser",
  "file-analysis": "Analyzing a file",
  github: "Using GitHub",
  scratchpad: "Updating the scratchpad",
  "ask-user": "Waiting for your input",
} as const;

/**
 * Converts a known capability identifier into the only detail persisted for a
 * tool event. Model-provided input, output, URLs, prompts, and errors are not
 * eligible for this audit trail.
 */
export function createToolActivity(input: {
  toolId: keyof typeof toolLabels;
  toolCallId?: string;
  state: ToolActivityState;
}) {
  const label = toolLabels[input.toolId];
  return {
    type: `tool.${input.state}` as const,
    toolId: input.toolId,
    toolCallId: input.toolCallId,
    summary:
      input.state === "started"
        ? `${label}…`
        : input.state === "completed"
          ? `${label} completed`
          : `${label} failed`,
  };
}
