"use client";

import { cn } from "cn";

import { ActivitySection } from "@/components/conversations/details/activity-section";
import { NotesSection } from "@/components/conversations/details/notes-section";
import { PlanSection } from "@/components/conversations/details/plan-section";

import type { ConversationPlanStep } from "@/db/schema";
import type { TimelineActivity } from "@/executions/activity-timeline";

interface ConversationDetailsPanelProps {
  activities: TimelineActivity[];
  scratchpad: string;
  plan: ConversationPlanStep[];
  /**
   * Desktop's resizable side panel gives this a definite height to fill
   * (`h-full`). Mobile's collapsible drawer instead sizes to content — `h-full`
   * there would resolve against an ancestor far taller than this panel needs,
   * ballooning the drawer to fill the whole remaining screen. Pass `false`
   * when embedding it somewhere its height should stay content-driven.
   */
  fillHeight?: boolean;
}

/**
 * The side panel of an open conversation: activity and notes.
 */
export function ConversationDetailsPanel({
  activities,
  scratchpad,
  plan,
  fillHeight = true,
}: ConversationDetailsPanelProps) {
  return (
    <aside
      aria-label="Agent activity and chat controls"
      className={cn(
        "min-h-0 w-full overflow-y-auto border-t bg-sidebar/40 p-4 lg:border-t-0 lg:border-l",
        fillHeight ? "h-full" : "h-auto",
      )}
    >
      <div className="space-y-6">
        <PlanSection steps={plan} />
        <ActivitySection activities={activities} collapsibleRuns={fillHeight} />
        <NotesSection scratchpad={scratchpad} />
      </div>
    </aside>
  );
}
