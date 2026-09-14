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

import type { TimelineActivity } from "@/executions/activity-timeline";

/**
 * A readable activity trace backed only by Pilot's sanitized server events.
 * It deliberately excludes private model reasoning, prompts, tool inputs,
 * outputs, URLs, errors, and credentials. A tool call's start and outcome
 * render as one step that moves from "active" to its result in place
 * (see buildActivitySteps), instead of a new line appearing for each.
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
    <ChainOfThought
      className="mt-3 max-w-xl rounded-md border bg-muted/35 px-3 py-2"
      defaultOpen={false}
    >
      <ChainOfThoughtHeader className="text-foreground">
        <span className="flex items-center gap-2">
          <RiLoader4Line
            aria-hidden="true"
            className="animate-spin text-primary"
          />
          {header}
        </span>
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent className="border-t pt-3">
        <p className="text-xs leading-5 text-muted-foreground">
          Verified steps for this response. Private model reasoning and tool
          data stay private.
        </p>
        <div className="space-y-2">
          {steps.map((step) => {
            const { label, icon } = describeActivityStep(step);
            return (
              <ChainOfThoughtStep
                className={
                  step.status === "active"
                    ? "[&>div:first-child>div]:hidden"
                    : undefined
                }
                icon={icon}
                key={step.id}
                label={
                  step.count > 1 ? `${label} ×${String(step.count)}` : label
                }
                status={step.status === "active" ? "active" : "complete"}
              />
            );
          })}
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
