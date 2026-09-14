import {
  RiCheckboxCircleFill,
  RiLoader3Line,
  RiRadioButtonLine,
} from "@remixicon/react";

import type { ConversationPlanStep } from "@/db/schema";

const STEP_ICON: Record<ConversationPlanStep["status"], React.ReactNode> = {
  pending: (
    <RiRadioButtonLine
      aria-hidden="true"
      className="size-3.5 text-muted-foreground"
    />
  ),
  in_progress: (
    <RiLoader3Line aria-hidden="true" className="size-3.5 animate-spin" />
  ),
  done: (
    <RiCheckboxCircleFill
      aria-hidden="true"
      className="size-3.5 text-primary"
    />
  ),
};

const STEP_LABEL: Record<ConversationPlanStep["status"], string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

/**
 * The agent's live, visible step-by-step plan for this conversation.
 */
export function PlanSection({ steps }: { steps: ConversationPlanStep[] }) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-xs font-medium">Plan</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The agent&apos;s step-by-step progress on this conversation.
        </p>
      </div>
      {steps.length > 0 ? (
        <ol className="space-y-1.5">
          {steps.map((step) => (
            <li
              className="flex items-start gap-2 text-xs"
              key={step.id}
              title={STEP_LABEL[step.status]}
            >
              <span className="mt-0.5 shrink-0">{STEP_ICON[step.status]}</span>
              <span
                className={
                  step.status === "done"
                    ? "text-muted-foreground line-through"
                    : undefined
                }
              >
                {step.text}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground">
          A plan appears here once the agent breaks the work into steps.
        </p>
      )}
    </section>
  );
}
