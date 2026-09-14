import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiLoader4Line,
} from "@remixicon/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  groupActivityTimeline,
  type ActivityTimelineRun as ActivityRun,
  type TimelineActivity,
} from "@/executions/activity-timeline";

import type { ActivityEventType } from "@/executions/activity-event";

function activityIcon(type: ActivityEventType) {
  if (type === "execution.started" || type === "tool.started") {
    return (
      <RiLoader4Line
        aria-hidden="true"
        className="mt-0.5 shrink-0 animate-spin text-primary"
      />
    );
  }
  if (type === "execution.failed" || type === "tool.failed") {
    return (
      <RiErrorWarningLine
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-destructive"
      />
    );
  }
  return (
    <RiCheckboxCircleLine
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-primary"
    />
  );
}

function runStatusLabel(run: ActivityRun) {
  if (run.isFailed) return "Response failed";
  if (run.isWaitingForApproval) return "Waiting for approval";
  if (run.isComplete) return "Response completed";
  return "Pilot is working";
}

function ActivityRunItem({ run }: { run: ActivityRun }) {
  return (
    <AccordionItem value={run.id}>
      <AccordionTrigger>
        <span>{runStatusLabel(run)}</span>
        <span className="text-muted-foreground">
          {run.events.length} {run.events.length === 1 ? "step" : "steps"}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <ol className="space-y-2 border-l pl-3">
          {run.events.map((activity) => (
            <li className="flex gap-2 text-muted-foreground" key={activity.id}>
              {activityIcon(activity.type)}
              <span>{activity.summary}</span>
            </li>
          ))}
        </ol>
      </AccordionContent>
    </AccordionItem>
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
    <section className="space-y-2">
      <div>
        <h2 className="text-xs font-medium">Agent activity</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Verified events from Pilot while it works in this chat.
        </p>
      </div>
      {runs.length > 0 ? (
        <Accordion defaultValue={runs.at(-1)?.id} type="single">
          {runs.map((run) => (
            <ActivityRunItem key={run.id} run={run} />
          ))}
        </Accordion>
      ) : (
        <p className="text-xs text-muted-foreground">
          Activity appears here while Pilot uses a supported capability. Send a
          message to begin.
        </p>
      )}
    </section>
  );
}
