import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
} from "@/components/ai-elements/chain-of-thought";
import { buildActivitySteps } from "@/executions/activity-timeline";

import { ActivityStepRow } from "./activity-step-row";

import type { PersistedActivity } from "./conversation-types";

/**
 * A per-response trace of Pilot's verified steps — collapsed by default and
 * independent per message, so a long conversation reads as many small
 * disclosures rather than one growing chain-of-thought log. Every step here
 * already finished, so nothing in this trace ever spins. A tool call's start
 * and outcome are one merged step (see buildActivitySteps), not two separate
 * "running" and "ran" lines. A step carrying real captured content (the
 * command that ran, its output, search results) is itself independently
 * expandable via ActivityStepRow.
 */
export function MessageActivityTrace({
  events,
}: {
  events: PersistedActivity[];
}) {
  const isFailed = events.some((event) => event.type === "execution.failed");
  const steps = buildActivitySteps(events);
  // A plain, successful reply has nothing worth disclosing beyond the
  // "started"/"completed" bookends, so skip the trace entirely rather than
  // showing an empty collapsible for every message.
  if (!isFailed && steps.length === 0) return null;
  const stepCount = steps.length;
  const stepNoun = stepCount === 1 ? "step" : "steps";
  const headerLabel = isFailed
    ? "Response failed"
    : `Worked through ${stepCount} ${stepNoun}`;

  return (
    <ChainOfThought className="max-w-xl" defaultOpen={false}>
      <ChainOfThoughtHeader className="text-xs">
        {headerLabel}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <div className="space-y-2">
          {steps.length > 0 ? (
            steps.map((step) => <ActivityStepRow key={step.id} step={step} />)
          ) : (
            <p className="text-xs text-muted-foreground">
              No additional steps were recorded before this failed.
            </p>
          )}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
