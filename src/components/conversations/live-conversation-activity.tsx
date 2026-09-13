import {
  CheckCircle2,
  CircleAlert,
  FileText,
  LoaderCircle,
  Search,
  Wrench,
} from "lucide-react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";

import type { ActivityEventType } from "@/executions/activity-event";
import type { TimelineActivity } from "@/executions/activity-timeline";

type Activity = TimelineActivity;

function stepStatus(type: ActivityEventType): "active" | "complete" {
  return type === "execution.started" || type === "tool.started"
    ? "active"
    : "complete";
}

function stepIcon(type: ActivityEventType) {
  if (type === "skill.selected") return FileText;
  if (
    type === "tool.started" ||
    type === "tool.completed" ||
    type === "tool.awaiting_approval"
  )
    return Search;
  if (type === "tool.failed" || type === "execution.failed") return CircleAlert;
  if (type === "execution.completed") return CheckCircle2;
  return Wrench;
}

function stepDescription(type: ActivityEventType) {
  if (type === "skill.selected")
    return "Selected safe guidance for this response";
  if (type === "execution.started") return "Preparing this chat response";
  if (type === "tool.started") return "Using an enabled capability";
  if (type === "tool.completed") return "Capability result received";
  if (type === "tool.failed") return "Capability did not complete";
  if (type === "tool.awaiting_approval") return "Waiting for your approval";
  if (type === "execution.completed") return "Response completed";
  if (type === "execution.failed") return "Response failed";
  return "Response execution";
}

/**
 * A readable activity trace backed only by Pilot's sanitized server events.
 * It deliberately excludes private model reasoning, prompts, tool inputs,
 * outputs, URLs, errors, and credentials.
 */
export function LiveConversationActivity({
  events = [],
}: {
  events?: Activity[];
}) {
  const currentEvents = events.filter(
    (event) =>
      event.type === "execution.started" ||
      event.type === "skill.selected" ||
      event.type === "tool.started" ||
      event.type === "tool.completed" ||
      event.type === "tool.failed" ||
      event.type === "tool.awaiting_approval" ||
      event.type === "execution.completed" ||
      event.type === "execution.failed",
  );
  const latest = currentEvents.at(-1);
  const summary = latest?.summary ?? "Pilot is responding…";
  const hasActiveTool = latest?.type === "tool.started";

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
          Verified steps for this response. Private model reasoning and tool
          data stay private.
        </p>
        <div className="space-y-3">
          {currentEvents.map((event, index) => (
            <ChainOfThoughtStep
              className={
                index === currentEvents.length - 1 && hasActiveTool
                  ? "[&>div:first-child>div]:hidden"
                  : undefined
              }
              description={stepDescription(event.type)}
              icon={stepIcon(event.type)}
              key={event.id}
              label={event.summary}
              status={stepStatus(event.type)}
            />
          ))}
          {hasActiveTool ? null : (
            <ChainOfThoughtStep
              className="[&>div:first-child>div]:hidden"
              description="Streaming the answer into this chat"
              icon={FileText}
              label="Writing response"
              status="active"
            />
          )}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
