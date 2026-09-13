import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import type { ActivityEventType } from "@/executions/activity-event";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Search,
  Wrench,
} from "lucide-react";

function stepStatus(
  type: ActivityEventType,
): "active" | "complete" | "pending" {
  return type === "execution.started" || type === "tool.started"
    ? "active"
    : "complete";
}

function stepIcon(type: ActivityEventType) {
  if (type === "tool.started" || type === "tool.completed") return Search;
  if (type === "tool.failed" || type === "execution.failed") return CircleAlert;
  if (type === "execution.completed") return CheckCircle2;
  return Wrench;
}

/**
 * A readable activity trace backed only by Pilot's sanitized server events.
 * It deliberately excludes private model reasoning, prompts, tool inputs,
 * outputs, URLs, errors, and credentials.
 */
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
    <ChainOfThought
      className="mt-3 max-w-xl rounded-2xl border border-border bg-muted/35 px-3 py-2"
      defaultOpen={false}
    >
      <ChainOfThoughtHeader className="text-foreground">
        <span className="flex items-center gap-2">
          <LoaderCircle
            aria-hidden="true"
            className="size-3.5 animate-spin text-primary"
          />
          {summary}
        </span>
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent className="border-t border-border pt-3">
        <p className="text-xs leading-5 text-muted-foreground">
          Pilot’s verified working steps. Private model reasoning and tool data
          are never shown here.
        </p>
        <div className="space-y-3">
          {(currentEvents.length ? currentEvents : [undefined]).map(
            (event, index) => (
              <ChainOfThoughtStep
                description={
                  event
                    ? event.type.startsWith("tool.")
                      ? "Protected capability activity"
                      : "Conversation execution"
                    : "Preparing the response"
                }
                icon={event ? stepIcon(event.type) : LoaderCircle}
                key={event?.id ?? "responding"}
                label={event?.summary ?? "Generating a response"}
                status={event ? stepStatus(event.type) : "active"}
                className={
                  index === currentEvents.length - 1
                    ? "[&>div:first-child>div]:hidden"
                    : undefined
                }
              />
            ),
          )}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
