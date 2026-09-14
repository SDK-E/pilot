import type { ActivityEventType } from "@/executions/activity-event";

export interface TimelineActivity {
  id: string;
  executionId: string;
  summary: string;
  type: ActivityEventType;
  toolId?: string | null;
  createdAt?: string | Date;
}

export interface ActivityTimelineRun {
  id: string;
  events: TimelineActivity[];
  isComplete: boolean;
  isFailed: boolean;
  isWaitingForApproval: boolean;
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
      isWaitingForApproval: false,
    };
    current.events.push(activity);
    current.isComplete ||= activity.type === "execution.completed";
    current.isFailed ||= activity.type === "execution.failed";
    // Tracks the *latest* approval state rather than sticking forever, so a
    // run that resumed after approval stops reading as still waiting.
    if (activity.type === "tool.awaiting_approval") {
      current.isWaitingForApproval = true;
    } else if (
      (
        [
          "tool.completed",
          "execution.completed",
          "execution.failed",
        ] as ActivityEventType[]
      ).includes(activity.type)
    ) {
      current.isWaitingForApproval = false;
    }
    runs.set(activity.executionId, current);
  }
  return runs.values().toArray();
}

export interface GroupedActivity {
  id: string;
  type: ActivityEventType;
  summary: string;
  count: number;
}

/**
Collapses a run of consecutive events sharing a type and summary (e.g. the
same tool starting three times in a row) into one entry with a count, so
a repeated step reads as "Searching the web… ×3" rather than three
identical lines. Events that aren't adjacent duplicates are left alone.
*/
export function groupConsecutiveActivity(
  events: TimelineActivity[],
): GroupedActivity[] {
  const grouped: GroupedActivity[] = [];
  for (const event of events) {
    const last = grouped.at(-1);
    if (last?.type === event.type && last.summary === event.summary) {
      last.count += 1;
    } else {
      grouped.push({
        id: event.id,
        type: event.type,
        summary: event.summary,
        count: 1,
      });
    }
  }
  return grouped;
}
