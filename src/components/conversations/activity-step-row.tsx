"use client";

import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { describeActivityStep } from "./activity-step-presentation";
import {
  MESSAGE_RESPONSE_COMPONENTS,
  MESSAGE_RESPONSE_CONTROLS,
} from "./message-response-controls";

import type { ActivityStep } from "@/executions/activity-timeline";

/**
 * One line in the activity trace. A step with no captured `detail` (skills,
 * ask-user, plan, scratchpad — anything without real command/output content
 * to show) renders exactly as before: an icon and a label. A step that
 * carries a `detail` — the real command and output, search results, etc.,
 * captured from Pilot AI — becomes its own independently expandable row,
 * closed by default, rendering that content through the same Streamdown
 * component already used for reply text (including its compact code-block
 * rendering, `MESSAGE_RESPONSE_COMPONENTS`).
 *
 * The trigger and content are two Collapsible instances sharing one
 * open/onOpenChange pair (the same split ChainOfThought itself uses between
 * its Header and Content), since the trigger lives in ChainOfThoughtStep's
 * `label` slot and the body in its `children` slot.
 */
export function ActivityStepRow({
  step,
  className,
}: {
  step: ActivityStep;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { label, icon } = describeActivityStep(step);
  const status = step.status === "active" ? "active" : "complete";

  if (!step.detail) {
    return (
      <ChainOfThoughtStep
        className={className}
        icon={icon}
        label={label}
        status={status}
      />
    );
  }

  return (
    <ChainOfThoughtStep
      className={className}
      icon={icon}
      label={
        <Collapsible onOpenChange={setIsOpen} open={isOpen}>
          <CollapsibleTrigger className="-my-0.5 flex items-center gap-1.5 text-left hover:text-foreground">
            {label}
            <ChevronDownIcon
              className={cn(
                "size-3.5 shrink-0 transition-transform",
                isOpen ? "rotate-180" : "rotate-0",
              )}
            />
          </CollapsibleTrigger>
        </Collapsible>
      }
      status={status}
    >
      <Collapsible open={isOpen}>
        <CollapsibleContent className="text-[11px]">
          <MessageResponse
            components={MESSAGE_RESPONSE_COMPONENTS}
            controls={MESSAGE_RESPONSE_CONTROLS}
          >
            {step.detail}
          </MessageResponse>
        </CollapsibleContent>
      </Collapsible>
    </ChainOfThoughtStep>
  );
}
