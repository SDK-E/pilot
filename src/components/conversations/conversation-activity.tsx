import { CheckCircle2, ChevronRight, CircleAlert } from "lucide-react";
import type { ActivityEventType } from "@/executions/activity-event";

type ConversationActivityProps = {
  events: Array<{
    id: string;
    summary: string;
    type: ActivityEventType;
  }>;
};

export function ConversationActivity({ events }: ConversationActivityProps) {
  if (events.length === 0) return null;
  const latest = events.at(-1);
  const failed =
    latest?.type === "execution.failed" || latest?.type === "tool.failed";

  return (
    <details className="group mt-1 w-fit rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        {failed ? (
          <CircleAlert
            aria-hidden="true"
            className="size-3.5 text-destructive"
          />
        ) : (
          <CheckCircle2 aria-hidden="true" className="size-3.5 text-primary" />
        )}
        {latest?.summary}
      </summary>
      <ul className="mt-2 space-y-1 border-l border-border pl-3">
        {events.map((event) => (
          <li key={event.id}>{event.summary}</li>
        ))}
      </ul>
    </details>
  );
}
