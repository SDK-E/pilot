import {
  RiErrorWarningLine,
  RiFileSearchLine,
  RiFileTextLine,
  RiGithubFill,
  RiGlobalLine,
  RiListCheck3,
  RiQuestionLine,
  RiSearchLine,
  RiStickyNoteLine,
  RiTerminalBoxLine,
  type RemixiconComponentType,
} from "@remixicon/react";

import type { ActivityStep } from "@/executions/activity-timeline";

interface ToolLabels {
  running: string;
  done: string;
  failed: string;
  // Only tools whose repeated calls read naturally as a count of the same
  // noun (commands) need this; everything else falls back to the singular
  // label with a plain "×N" suffix.
  runningMany?: (count: number) => string;
  doneMany?: (count: number) => string;
  failedMany?: (count: number) => string;
  // Lets a step be told apart from the rest of the trace at a glance, the
  // way Claude Code's tool calls each carry their own glyph — reserved for
  // named tools, not stamped on every line as pure decoration.
  icon?: RemixiconComponentType;
}

// One line of present/past-tense copy per tool, so a call reads as
// "Searching the web…" while active and "Searched the web" once it
// resolves, in the same row rather than two separate lines.
const TOOL_LABELS: Record<string, ToolLabels> = {
  "web-search": {
    running: "Searching the web",
    done: "Searched the web",
    failed: "Web search failed",
    icon: RiSearchLine,
  },
  langsearch: {
    running: "Searching the web",
    done: "Searched the web",
    failed: "Web search failed",
    icon: RiSearchLine,
  },
  browser: {
    running: "Using the browser",
    done: "Used the browser",
    failed: "Browser use failed",
    icon: RiGlobalLine,
  },
  "file-analysis": {
    running: "Analyzing a file",
    done: "Analyzed a file",
    failed: "File analysis failed",
    icon: RiFileSearchLine,
  },
  github: {
    running: "Using GitHub",
    done: "Used GitHub",
    failed: "GitHub request failed",
    icon: RiGithubFill,
  },
  scratchpad: {
    running: "Updating the scratchpad",
    done: "Updated the scratchpad",
    failed: "Scratchpad update failed",
    icon: RiStickyNoteLine,
  },
  "ask-user": {
    running: "Waiting for your input",
    done: "Got your input",
    failed: "Didn't get an answer",
    icon: RiQuestionLine,
  },
  plan: {
    running: "Updating the plan",
    done: "Updated the plan",
    failed: "Plan update failed",
    icon: RiListCheck3,
  },
  "code-sandbox": {
    running: "Running a command",
    done: "Ran a command",
    failed: "Failed to run a command",
    runningMany: (count) => `Running ${String(count)} commands`,
    doneMany: (count) => `Ran ${String(count)} commands`,
    failedMany: (count) => `Failed to run ${String(count)} commands`,
    icon: RiTerminalBoxLine,
  },
};

const FALLBACK_TOOL_LABELS: ToolLabels = {
  running: "Using a capability",
  done: "Used a capability",
  failed: "A capability failed",
};

export interface ActivityStepPresentation {
  label: string;
  // Undefined keeps the step on ChainOfThoughtStep's plain default dot —
  // only tools with a mapped icon (or a failure/skill step) get one.
  icon?: RemixiconComponentType;
  isFailed: boolean;
}

/**
Turns a merged activity step into the one line it renders as. Tool steps
read as present tense while active and past tense once resolved, in the
same row; skill steps use their own already human-readable summary as-is.
*/
export function describeActivityStep(
  step: ActivityStep,
): ActivityStepPresentation {
  if (step.kind === "skill") {
    return { label: step.summary, icon: RiFileTextLine, isFailed: false };
  }
  const tool = TOOL_LABELS[step.toolId ?? ""] ?? FALLBACK_TOOL_LABELS;
  const isFailed = step.status === "failed";
  const labelByStatus: Record<ActivityStep["status"], string> = {
    active: tool.running,
    failed: tool.failed,
    complete: tool.done,
  };
  const manyByStatus: Record<
    ActivityStep["status"],
    ((count: number) => string) | undefined
  > = {
    active: tool.runningMany,
    failed: tool.failedMany,
    complete: tool.doneMany,
  };
  const label =
    step.count > 1
      ? (manyByStatus[step.status]?.(step.count) ??
        `${labelByStatus[step.status]} ×${String(step.count)}`)
      : labelByStatus[step.status];
  return {
    label,
    icon: isFailed ? RiErrorWarningLine : tool.icon,
    isFailed,
  };
}
