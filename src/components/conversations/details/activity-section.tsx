import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
} from "lucide-react";

import {
  groupActivityTimeline,
  type ActivityTimelineRun as ActivityRun,
  type TimelineActivity,
} from "@/executions/activity-timeline";

import type { ActivityEventType } from "@/executions/activity-event";

function activityIcon(type: ActivityEventType) {
  if (type === "execution.started" || type === "tool.started") {
    return (
      <LoaderCircle
        aria-hidden="true"
        className="mt-0.5 size-3.5 animate-spin text-primary"
      />
    );
  }
  if (type === "execution.failed" || type === "tool.failed") {
    return (
      <CircleAlert
        aria-hidden="true"
        className="mt-0.5 size-3.5 text-destructive"
      />
    );
  }
  return (
    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 text-primary" />
  );
}

function runStatusLabel(run: ActivityRun) {
  if (run.isFailed) return "Response failed";
  if (run.isWaitingForApproval) return "Waiting for approval";
  if (run.isComplete) return "Response completed";
  return "Pilot is working";
}

function ActivityRunItem({
  run,
  isOpen,
}: {
  run: ActivityRun;
  isOpen: boolean;
}) {
  return (
    <details
      className="group rounded-lg border border-border/80 bg-background/45 px-2.5 py-2"
      open={isOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium [&::-webkit-details-marker]:hidden">
        <span>{runStatusLabel(run)}</span>
        <span className="text-muted-foreground">
          {run.events.length} {run.events.length === 1 ? "step" : "steps"}
        </span>
      </summary>
      <ol className="mt-3 space-y-3 border-l border-border pl-3">
        {run.events.map((activity) => (
          <li
            className="flex gap-2 text-xs text-muted-foreground"
            key={activity.id}
          >
            {activityIcon(activity.type)}
            <span>{activity.summary}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

/**
 * Verified server events grouped by response run. Newest run open by default.
 */
export function ActivitySection({
  activities,
}: {
  activities: TimelineActivity[];
}) {
  const runs = groupActivityTimeline(activities);
  return (
    <section>
      <h2 className="text-sm font-medium">Agent activity</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Verified events from Pilot while it works in this chat.
      </p>
      <details className="group mt-3 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
          <span>
            {runs.length > 0
              ? `${runs.length} response runs`
              : "No activity yet"}
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
          />
        </summary>
        {runs.length > 0 ? (
          <ol className="mt-3 space-y-3">
            {runs.map((run, index) => (
              <li key={run.id}>
                <ActivityRunItem isOpen={index === runs.length - 1} run={run} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Activity appears here while Pilot uses a supported capability. Send
            a message to begin.
          </p>
        )}
      </details>
    </section>
  );
}
