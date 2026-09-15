import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EXECUTION_BOOKEND_TYPES } from "@/executions/activity-event";
import {
  buildActivitySteps,
  groupActivityTimeline,
  type ActivityTimelineRun as ActivityRun,
  type TimelineActivity,
} from "@/executions/activity-timeline";

import { ActivityStepRow } from "../activity-step-row";

function runSteps(run: ActivityRun) {
  return run.events.filter(
    (event) => !EXECUTION_BOOKEND_TYPES.includes(event.type),
  );
}

function runStatusLabel(run: ActivityRun) {
  if (run.isFailed) return "Response failed";
  if (run.isComplete) return "Response completed";
  return "Pilot is working";
}

/**
 * The same step presentation the main chat trace uses (`ActivityStepRow`)
 * — human-readable labels, not the raw persisted `summary`, and a real
 * command's captured detail is expandable here too instead of discarded.
 */
function RunStepList({ run }: { run: ActivityRun }) {
  const steps = buildActivitySteps(runSteps(run));
  if (steps.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Pilot answered directly, without using any capability.
      </p>
    );
  }
  return (
    <div className="space-y-2 border-l pl-3">
      {steps.map((step) => (
        <ActivityStepRow key={step.id} step={step} />
      ))}
    </div>
  );
}

function runStepCount(run: ActivityRun) {
  return buildActivitySteps(runSteps(run)).length;
}

function ActivityRunItem({ run }: { run: ActivityRun }) {
  const stepCount = runStepCount(run);
  return (
    <AccordionItem value={run.id}>
      <AccordionTrigger>
        <span>{runStatusLabel(run)}</span>
        <span className="text-muted-foreground">
          {stepCount} {stepCount === 1 ? "step" : "steps"}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <RunStepList run={run} />
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * A run rendered without Radix Accordion, for when this whole section is
 * already nested inside another disclosure (the mobile drawer). Radix binds
 * an inner AccordionContent's height to a CSS variable it measures on open;
 * nested inside a second, still-animating Radix disclosure that measurement
 * can capture a far larger box than the content needs, leaving a tall empty
 * gap. Skipping the extra collapse level sidesteps that entirely — there's
 * usually only one run to show once it's already behind the drawer's own
 * toggle.
 */
function StaticRunItem({ run }: { run: ActivityRun }) {
  const stepCount = runStepCount(run);
  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="flex items-center justify-between gap-2 text-xs font-medium">
        <span>{runStatusLabel(run)}</span>
        <span className="text-muted-foreground">
          {stepCount} {stepCount === 1 ? "step" : "steps"}
        </span>
      </div>
      <RunStepList run={run} />
    </div>
  );
}

/**
 * Verified server events grouped by response run.
 *
 * On its own (e.g. the desktop side panel, already visible) each run is an
 * accordion item with the newest one open by default. Pass
 * `collapsibleRuns={false}` where this mounts inside its own disclosure (the
 * mobile drawer): it renders runs as plain, always-visible blocks instead —
 * both because a second nested toggle is rarely useful once the drawer
 * itself already hid this, and because nesting Radix's Accordion inside
 * another Radix disclosure can badly mis-measure the open height (see
 * StaticRunItem).
 */
function ActivityRuns({
  runs,
  collapsibleRuns,
}: {
  runs: ActivityRun[];
  collapsibleRuns: boolean;
}) {
  if (!collapsibleRuns) {
    return (
      <div className="space-y-2">
        {runs.map((run) => (
          <StaticRunItem key={run.id} run={run} />
        ))}
      </div>
    );
  }
  return (
    <Accordion collapsible defaultValue={runs.at(-1)?.id} type="single">
      {runs.map((run) => (
        <ActivityRunItem key={run.id} run={run} />
      ))}
    </Accordion>
  );
}

export function ActivitySection({
  activities,
  collapsibleRuns = true,
}: {
  activities: TimelineActivity[];
  collapsibleRuns?: boolean;
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
        <ActivityRuns collapsibleRuns={collapsibleRuns} runs={runs} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Activity appears here while Pilot uses a supported capability. Send a
          message to begin.
        </p>
      )}
    </section>
  );
}
