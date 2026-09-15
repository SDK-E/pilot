import { RiLoader4Line } from "@remixicon/react";
import { FileText } from "lucide-react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { buildActivitySteps } from "@/executions/activity-timeline";

import { describeActivityStep } from "./activity-step-presentation";
import { ActivityStepRow } from "./activity-step-row";

import type { TimelineActivity } from "@/executions/activity-timeline";

/**
 * A readable activity trace backed only by Pilot's sanitized server events —
 * a step's real command, output, or search results are shown (via
 * `ActivityStepRow`), but nothing about the model's own reasoning, since
 * that is never captured anywhere in this pipeline. A tool call's start and
 * outcome render as one step that moves from "active" to its result in
 * place (see buildActivitySteps), instead of a new line appearing for each.
 *
 * Open by default while the turn is live, so a step (e.g. "Running a
 * command…") is visible the moment it starts rather than hidden behind a
 * click — the same "watch it work" moment Claude Code gives for tool calls.
 * Once the turn finishes this component unmounts in favor of
 * MessageActivityTrace, which is collapsed by default for finished history.
 */
export function LiveConversationActivity({
  events = [],
}: {
  events?: TimelineActivity[];
}) {
  const steps = buildActivitySteps(events);
  const lastStep = steps.at(-1);
  const isStepActive = lastStep?.status === "active";
  const header = lastStep
    ? describeActivityStep(lastStep).label
    : "Pilot is responding…";

  return (
    <ChainOfThought className="mt-3 max-w-xl" defaultOpen>
      <ChainOfThoughtHeader className="text-foreground">
        <span className="flex items-center gap-2">
          <RiLoader4Line
            aria-hidden="true"
            className="animate-spin text-primary"
          />
          {header}
        </span>
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <p className="text-xs leading-5 text-muted-foreground">
          What Pilot is doing for this response — expand a step to see the real
          command, output, or results.
        </p>
        <div className="space-y-2">
          {steps.map((step) => (
            <ActivityStepRow
              className={
                step.status === "active"
                  ? "[&>div:first-child>div]:hidden"
                  : undefined
              }
              key={step.id}
              step={step}
            />
          ))}
          {isStepActive ? null : (
            <ChainOfThoughtStep
              className="[&>div:first-child>div]:hidden"
              icon={FileText}
              label="Writing response"
              status="active"
            />
          )}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
