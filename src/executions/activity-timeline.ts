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
    current.isWaitingForApproval ||= activity.type === "tool.awaiting_approval";
    runs.set(activity.executionId, current);
  }
  return [...runs.values()];
}
