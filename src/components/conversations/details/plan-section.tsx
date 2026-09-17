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
/**
 * Renders nothing until the agent has an actual plan — an empty section
 * that just restates its own purpose adds noise without adding information,
 * so this (like ActivitySection and NotesSection) stays absent rather than
 * showing a permanent explainer.
 */
export function PlanSection({ steps }: { steps: ConversationPlanStep[] }) {
  if (steps.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium">Plan</h2>
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
    </section>
  );
}
