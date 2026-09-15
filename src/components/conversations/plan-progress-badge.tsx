import { Badge } from "@/components/ui/badge";

import type { ConversationPlanStep } from "@/db/schema";

function planProgress(steps: ConversationPlanStep[]) {
  return {
    done: steps.filter((step) => step.status === "done").length,
    total: steps.length,
  };
}

/**
 * A header-adjacent affordance for the plan tool's step list, which
 * otherwise sits only in the details panel/drawer and is easy to miss.
 * Clicking it opens that panel to the same place.
 */
export function PlanProgressBadge({
  steps,
  onClick,
}: {
  steps: ConversationPlanStep[];
  onClick: () => void;
}) {
  const { done, total } = planProgress(steps);
  if (total === 0) return null;
  return (
    <Badge asChild className="h-6 cursor-pointer px-2" variant="secondary">
      <button onClick={onClick} type="button">
        {`Plan: ${String(done)}/${String(total)}`}
      </button>
    </Badge>
  );
}
