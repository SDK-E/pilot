"use client";

import { ChevronRight } from "lucide-react";

import { ActivitySection } from "@/components/conversations/details/activity-section";
import { ApprovalsSection } from "@/components/conversations/details/approvals-section";
import { NotesSection } from "@/components/conversations/details/notes-section";
import { TasksSection } from "@/components/conversations/details/tasks-section";

import type { AgentKindId } from "@/agents/agent-kinds";
import type { TimelineActivity } from "@/executions/activity-timeline";

interface ConversationDetailsPanelProps {
  activities: TimelineActivity[];
  kind: AgentKindId;
  conversationId: string;
  tasks: { id: string; title: string; status: string }[];
  approvals: { id: string; summary: string; status: string }[];
  scratchpad: string;
  onTaskCreated: () => void;
}

/**
 * The side panel of an open conversation: activity, notes, tasks, and
 * approvals. Collapsible on small screens, always open on large ones.
 */
export function ConversationDetailsPanel({
  activities,
  kind,
  conversationId,
  tasks,
  approvals,
  scratchpad,
  onTaskCreated,
}: ConversationDetailsPanelProps) {
  return (
    <aside
      aria-label="Agent activity and chat controls"
      className="h-full min-h-0 w-full overflow-hidden border-t border-border bg-sidebar/40 lg:border-t-0 lg:border-l"
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium lg:hidden [&::-webkit-details-marker]:hidden">
          <span>Chat details</span>
          <span className="text-xs font-normal text-muted-foreground">
            {activities.length} activity{" "}
            {activities.length === 1 ? "event" : "events"} · {tasks.length}{" "}
            tasks
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
          />
        </summary>
        <div className="hidden max-h-[45svh] space-y-5 overflow-y-auto border-t border-border p-4 group-open:block lg:block lg:h-full lg:max-h-none lg:border-t-0">
          <ActivitySection activities={activities} />
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
      </details>
    </aside>
  );
}
