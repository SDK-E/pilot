import { RiFileTextLine, RiLoader4Line } from "@remixicon/react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { buildActivitySteps } from "@/executions/activity-timeline";

import { describeActivityStep } from "./activity-step-presentation";
import { ActivityStepRow } from "./activity-step-row";
import { asChainOfThoughtIcon } from "./chain-of-thought-icon";

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
 *
 * `isCompact` collapses this down to a single status line: when the desktop
 * details panel is already open, it shows the same live steps in full, so
 * repeating them here too would just duplicate the same information twice
 * on screen at once.
 */
export function LiveConversationActivity({
  events = [],
  isCompact = false,
}: {
  events?: TimelineActivity[];
  isCompact?: boolean;
}) {
  const steps = buildActivitySteps(events);
  const lastStep = steps.at(-1);
  const isStepActive = lastStep?.status === "active";
  const header = lastStep
    ? describeActivityStep(lastStep).label
    : "Pilot is responding…";

  if (isCompact) {
    const compactLabel =
      steps.length > 0 ? `Working — step ${String(steps.length)}` : header;
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <RiLoader4Line
          aria-hidden="true"
          className="animate-spin text-primary"
        />
        {compactLabel}
      </div>
    );
  }

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
              icon={asChainOfThoughtIcon(RiFileTextLine)}
              label="Writing response"
              status="active"
            />
          )}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
