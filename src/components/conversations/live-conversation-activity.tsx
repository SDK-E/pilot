import { ChevronRight, LoaderCircle } from "lucide-react";
import type { ActivityEventType } from "@/executions/activity-event";

/** Displays the current stream state and sanitized persisted tool activity. */
export function LiveConversationActivity({
  events = [],
}: {
  events?: Array<{ id: string; summary: string; type: ActivityEventType }>;
}) {
  const currentEvents = events.filter(
    (event) =>
      event.type === "execution.started" ||
      event.type === "tool.started" ||
      event.type === "tool.completed" ||
      event.type === "tool.failed",
  );
  const latest = currentEvents.at(-1);
  const summary = latest?.summary ?? "Pilot is responding…";

  return (
    <details className="group mt-1 w-fit rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        <LoaderCircle
          aria-hidden="true"
          className="size-3.5 animate-spin text-primary"
        />
        {summary}
      </summary>
      {currentEvents.length > 0 ? (
        <ul className="mt-2 space-y-1 border-l border-border pl-3">
          {currentEvents.map((event) => (
            <li key={event.id}>{event.summary}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 border-l border-border pl-3">
          Generating a response through Pilot.
        </p>
      )}
    </details>
  );
}
