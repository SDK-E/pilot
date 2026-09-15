import {
  EXECUTION_BOOKEND_TYPES,
  type ActivityEventType,
} from "@/executions/activity-event";

export interface TimelineActivity {
  id: string;
  executionId: string;
  summary: string;
  detail?: string | null;
  type: ActivityEventType;
  toolId?: string | null;
  toolCallId?: string | null;
  createdAt?: string | Date;
}

export interface ActivityTimelineRun {
  id: string;
  events: TimelineActivity[];
  isComplete: boolean;
  isFailed: boolean;
}

/**
Groups only server-generated, already-sanitized activity by one response run.
*/
export function groupActivityTimeline(
  activities: TimelineActivity[],
): ActivityTimelineRun[] {
  const runs = new Map<string, ActivityTimelineRun>();
  for (const activity of activities) {
    const current = runs.get(activity.executionId) ?? {
      id: activity.executionId,
      events: [],
      isComplete: false,
      isFailed: false,
    };
    current.events.push(activity);
    current.isComplete ||= activity.type === "execution.completed";
    current.isFailed ||= activity.type === "execution.failed";
    runs.set(activity.executionId, current);
  }
  return runs.values().toArray();
}

export interface GroupedActivity {
  id: string;
  type: ActivityEventType;
  toolId?: string | null;
  summary: string;
  detail?: string | null;
  count: number;
}

/**
Collapses a run of consecutive events sharing a type and summary (e.g. the
same tool starting three times in a row) into one entry with a count, so
a repeated step reads as "Searching the web… ×3" rather than three
identical lines. Events that aren't adjacent duplicates are left alone. A
step carrying real captured content (`detail`) never collapses into a
count with its neighbors, even when type/summary match — each real command
or search stays its own visible, individually-expandable row.
*/
export function groupConsecutiveActivity(
  events: TimelineActivity[],
): GroupedActivity[] {
  const grouped: GroupedActivity[] = [];
  for (const event of events) {
    const last = grouped.at(-1);
    const canMerge =
      last?.type === event.type &&
      last.summary === event.summary &&
      !last.detail &&
      !event.detail;
    if (canMerge) {
      last.count += 1;
    } else {
      grouped.push({
        id: event.id,
        type: event.type,
        toolId: event.toolId,
        summary: event.summary,
        detail: event.detail,
        count: 1,
      });
    }
  }
  return grouped;
}

type ActivityStepStatus = "active" | "complete" | "failed";

export interface ActivityStep {
  id: string;
  kind: "tool" | "skill";
  toolId?: string | null;
  status: ActivityStepStatus;
  summary: string;
  detail?: string | null;
  count: number;
}

const TOOL_OUTCOME_STATUS: Partial<
  Record<ActivityEventType, ActivityStepStatus>
> = {
  "tool.completed": "complete",
  "tool.failed": "failed",
};

/**
Folds a tool's terminal event onto its still-open "started" entry in
`paired` (matched by toolCallId), in place, so the pair becomes one entry.
Returns false when there was nothing open to fold onto.
*/
function didFoldToolOutcome(
  paired: TimelineActivity[],
  openIndexByCallId: Map<string, number>,
  event: TimelineActivity,
): boolean {
  if (!event.toolCallId) return false;
  const openIndex = openIndexByCallId.get(event.toolCallId);
  if (openIndex === undefined) return false;
  const started = paired[openIndex];
  if (!started) return false;
  paired[openIndex] = {
    ...started,
    type: event.type,
    summary: event.summary,
    detail: event.detail,
  };
  openIndexByCallId.delete(event.toolCallId);
  return true;
}

function pairToolEvents(events: TimelineActivity[]): TimelineActivity[] {
  const paired: TimelineActivity[] = [];
  const openIndexByCallId = new Map<string, number>();

  for (const event of events) {
    if (EXECUTION_BOOKEND_TYPES.includes(event.type)) continue;
    if (event.type === "tool.started") {
      if (event.toolCallId)
        openIndexByCallId.set(event.toolCallId, paired.length);
      paired.push(event);
      continue;
    }
    if (!didFoldToolOutcome(paired, openIndexByCallId, event))
      paired.push(event);
  }

  return paired;
}

function activityStepStatus(type: ActivityEventType): ActivityStepStatus {
  if (type === "skill.selected") return "complete";
  return TOOL_OUTCOME_STATUS[type] ?? "active";
}

/**
Turns a run's raw events into display-ready steps: a tool call's start and
its outcome (matched by toolCallId) become one step that moves from
"active" to its result in place, rather than two separate lines for
"running" and "ran". A call with no toolCallId (or no matching start) still
renders, just without that merge. Repeated identical outcomes still
collapse into one counted step via groupConsecutiveActivity.
*/
export function buildActivitySteps(events: TimelineActivity[]): ActivityStep[] {
  return groupConsecutiveActivity(pairToolEvents(events)).map((step) => ({
    id: step.id,
    kind: step.type === "skill.selected" ? "skill" : "tool",
    toolId: step.toolId,
    status: activityStepStatus(step.type),
    summary: step.summary,
    detail: step.detail,
    count: step.count,
  }));
}
