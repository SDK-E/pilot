import {
  CheckCircle2,
  CircleAlert,
  FileText,
  Search,
  Wrench,
} from "lucide-react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  EXECUTION_BOOKEND_TYPES,
  type ActivityEventType,
} from "@/executions/activity-event";

import type { PersistedActivity } from "./conversation-types";

// ChainOfThoughtStep (a vendored AI Elements component) requires a
// LucideIcon component specifically, so its step icons stay on lucide-react
// even though the rest of the app uses the shadcn preset's remixicon set.
function stepIcon(type: ActivityEventType) {
  if (type === "skill.selected") return FileText;
  if (
    ["tool.started", "tool.completed", "tool.awaiting_approval"].includes(type)
  )
    return Search;
  if (["tool.failed", "execution.failed"].includes(type)) return CircleAlert;
  if (type === "execution.completed") return CheckCircle2;
  return Wrench;
}

const stepDescriptions: Record<ActivityEventType, string> = {
  "skill.selected": "Selected safe guidance for this response",
  "execution.started": "Preparing this chat response",
  "tool.started": "Used an enabled capability",
  "tool.completed": "Capability result received",
  "tool.failed": "Capability did not complete",
  "tool.awaiting_approval": "Waited for your approval",
  "execution.completed": "Response completed",
  "execution.failed": "Response failed",
};

/**
 * A per-response trace of Pilot's verified, sanitized steps — collapsed by
 * default and independent per message, so a long conversation reads as many
 * small disclosures rather than one growing chain-of-thought log. Every
 * event here already finished, so nothing in this trace ever spins.
 */
export function MessageActivityTrace({
  events,
}: {
  events: PersistedActivity[];
}) {
  const isFailed = events.some((event) => event.type === "execution.failed");
  const steps = events.filter(
    (event) => !EXECUTION_BOOKEND_TYPES.includes(event.type),
  );
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
    <ChainOfThought
      className="max-w-xl rounded-lg border bg-muted/25 px-3 py-2"
      defaultOpen={false}
    >
      <ChainOfThoughtHeader className="text-xs">
        {headerLabel}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent className="border-t pt-3">
        <div className="space-y-3">
          {steps.length > 0 ? (
            steps.map((event) => (
              <ChainOfThoughtStep
                description={stepDescriptions[event.type]}
                icon={stepIcon(event.type)}
                key={event.id}
                label={event.summary}
                status="complete"
              />
            ))
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
