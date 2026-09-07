import { CheckCircle2, ChevronRight } from "lucide-react";

type ConversationActivityProps = {
  events: Array<{
    id: string;
    summary: string;
    type: "execution.started" | "execution.completed" | "execution.failed";
  }>;
};

export function ConversationActivity({ events }: ConversationActivityProps) {
  if (events.length === 0) return null;

  return (
    <details className="group mt-1 w-fit rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        <CheckCircle2 aria-hidden="true" className="size-3.5 text-primary" />
        {events.at(-1)?.summary}
      </summary>
      <ul className="mt-2 space-y-1 border-l border-border pl-3">
        {events.map((event) => (
          <li key={event.id}>{event.summary}</li>
        ))}
      </ul>
    </details>
  );
}
