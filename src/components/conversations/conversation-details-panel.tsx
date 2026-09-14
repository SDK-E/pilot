"use client";

import { cn } from "cn";

import { ActivitySection } from "@/components/conversations/details/activity-section";
import { ApprovalsSection } from "@/components/conversations/details/approvals-section";
import { NotesSection } from "@/components/conversations/details/notes-section";
import { PlanSection } from "@/components/conversations/details/plan-section";
import { TasksSection } from "@/components/conversations/details/tasks-section";

import type { AgentKindId } from "@/agents/agent-kinds";
import type { ConversationPlanStep } from "@/db/schema";
import type { TimelineActivity } from "@/executions/activity-timeline";

interface ConversationDetailsPanelProps {
  activities: TimelineActivity[];
  kind: AgentKindId;
  conversationId: string;
  tasks: { id: string; title: string; status: string }[];
  approvals: { id: string; summary: string; status: string }[];
  scratchpad: string;
  plan: ConversationPlanStep[];
  onTaskCreated: () => void;
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
 * The side panel of an open conversation: activity, notes, tasks, and
 * approvals.
 */
export function ConversationDetailsPanel({
  activities,
  kind,
  conversationId,
  tasks,
  approvals,
  scratchpad,
  plan,
  onTaskCreated,
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
        <TasksSection
          conversationId={conversationId}
          onTaskCreated={onTaskCreated}
          tasks={tasks}
        />
        <ApprovalsSection
          approvals={approvals}
          conversationId={conversationId}
          kind={kind}
          onDecided={onTaskCreated}
        />
      </div>
    </aside>
  );
}
