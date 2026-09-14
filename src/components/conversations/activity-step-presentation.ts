import { CircleAlert, FileText, type LucideIcon } from "lucide-react";

import type { ActivityStep } from "@/executions/activity-timeline";

interface ToolLabels {
  running: string;
  done: string;
  failed: string;
  awaitingApproval: string;
}

// One line of present/past-tense copy per tool, so a call reads as
// "Searching the web…" while active and "Searched the web" once it
// resolves, in the same row rather than two separate lines.
const TOOL_LABELS: Record<string, ToolLabels> = {
  "web-search": {
    running: "Searching the web",
    done: "Searched the web",
    failed: "Web search failed",
    awaitingApproval: "Waiting to search the web",
  },
  langsearch: {
    running: "Searching the web",
    done: "Searched the web",
    failed: "Web search failed",
    awaitingApproval: "Waiting to search the web",
  },
  browser: {
    running: "Using the browser",
    done: "Used the browser",
    failed: "Browser use failed",
    awaitingApproval: "Waiting to use the browser",
  },
  "file-analysis": {
    running: "Analyzing a file",
    done: "Analyzed a file",
    failed: "File analysis failed",
    awaitingApproval: "Waiting to analyze a file",
  },
  github: {
    running: "Using GitHub",
    done: "Used GitHub",
    failed: "GitHub request failed",
    awaitingApproval: "Waiting to use GitHub",
  },
  scratchpad: {
    running: "Updating the scratchpad",
    done: "Updated the scratchpad",
    failed: "Scratchpad update failed",
    awaitingApproval: "Waiting to update the scratchpad",
  },
  "ask-user": {
    running: "Waiting for your input",
    done: "Got your input",
    failed: "Didn't get an answer",
    awaitingApproval: "Waiting for your input",
  },
  plan: {
    running: "Updating the plan",
    done: "Updated the plan",
    failed: "Plan update failed",
    awaitingApproval: "Waiting to update the plan",
  },
  "code-sandbox": {
    running: "Running code in the sandbox",
    done: "Ran code in the sandbox",
    failed: "Sandbox run failed",
    awaitingApproval: "Waiting to run code in the sandbox",
  },
};

const FALLBACK_TOOL_LABELS: ToolLabels = {
  running: "Using a capability",
  done: "Used a capability",
  failed: "A capability failed",
  awaitingApproval: "Waiting for approval",
};

export interface ActivityStepPresentation {
  label: string;
  // Undefined keeps the step on ChainOfThoughtStep's plain default dot: most
  // steps read fine as text alone, so an icon is reserved for the two cases
  // that genuinely change how a line should be read (a failure, or a named
  // skill), not stamped on every line as decoration.
  icon?: LucideIcon;
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
    return { label: step.summary, icon: FileText, isFailed: false };
  }
  const tool = TOOL_LABELS[step.toolId ?? ""] ?? FALLBACK_TOOL_LABELS;
  const isFailed = step.status === "failed";
  const labelByStatus: Record<ActivityStep["status"], string> = {
    active: tool.running,
    failed: tool.failed,
    awaiting_approval: tool.awaitingApproval,
    complete: tool.done,
  };
  return {
    label: labelByStatus[step.status],
    icon: isFailed ? CircleAlert : undefined,
    isFailed,
  };
}
