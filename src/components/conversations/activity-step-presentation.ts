import {
  RiErrorWarningLine,
  RiFileTextLine,
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
}

// One line of present/past-tense copy per tool, so a call reads as
// "Searching the web…" while active and "Searched the web" once it
// resolves, in the same row rather than two separate lines.
const TOOL_LABELS: Record<string, ToolLabels> = {
  "web-search": {
    running: "Searching the web",
    done: "Searched the web",
    failed: "Web search failed",
  },
  langsearch: {
    running: "Searching the web",
    done: "Searched the web",
    failed: "Web search failed",
  },
  browser: {
    running: "Using the browser",
    done: "Used the browser",
    failed: "Browser use failed",
  },
  "file-analysis": {
    running: "Analyzing a file",
    done: "Analyzed a file",
    failed: "File analysis failed",
  },
  github: {
    running: "Using GitHub",
    done: "Used GitHub",
    failed: "GitHub request failed",
  },
  scratchpad: {
    running: "Updating the scratchpad",
    done: "Updated the scratchpad",
    failed: "Scratchpad update failed",
  },
  "ask-user": {
    running: "Waiting for your input",
    done: "Got your input",
    failed: "Didn't get an answer",
  },
  plan: {
    running: "Updating the plan",
    done: "Updated the plan",
    failed: "Plan update failed",
  },
  "code-sandbox": {
    running: "Running a command",
    done: "Ran a command",
    failed: "Failed to run a command",
    runningMany: (count) => `Running ${String(count)} commands`,
    doneMany: (count) => `Ran ${String(count)} commands`,
    failedMany: (count) => `Failed to run ${String(count)} commands`,
  },
};

const FALLBACK_TOOL_LABELS: ToolLabels = {
  running: "Using a capability",
  done: "Used a capability",
  failed: "A capability failed",
};

export interface ActivityStepPresentation {
  label: string;
  // Undefined keeps the step on ChainOfThoughtStep's plain default dot: most
  // steps read fine as text alone, so an icon is reserved for the two cases
  // that genuinely change how a line should be read (a failure, or a named
  // skill), not stamped on every line as decoration.
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
    icon: isFailed ? RiErrorWarningLine : undefined,
    isFailed,
  };
}
