import { RiLoader4Line } from "@remixicon/react";
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

import type { ActivityEventType } from "@/executions/activity-event";
import type { TimelineActivity } from "@/executions/activity-timeline";

type Activity = TimelineActivity;

function stepStatus(type: ActivityEventType): "active" | "complete" {
  return type === "execution.started" || type === "tool.started"
    ? "active"
    : "complete";
}

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
  "tool.started": "Using an enabled capability",
  "tool.completed": "Capability result received",
  "tool.failed": "Capability did not complete",
  "tool.awaiting_approval": "Waiting for your approval",
  "execution.completed": "Response completed",
  "execution.failed": "Response failed",
};

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
  const latest = events.at(-1);
  const summary = latest?.summary ?? "Pilot is responding…";
  const hasActiveTool = latest?.type === "tool.started";

  return (
    <ChainOfThought
      className="mt-3 max-w-xl rounded-md border bg-muted/35 px-3 py-2"
      defaultOpen={false}
    >
      <ChainOfThoughtHeader className="text-foreground">
        <span className="flex items-center gap-2">
          <RiLoader4Line
            aria-hidden="true"
            className="animate-spin text-primary"
          />
          {summary}
        </span>
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent className="border-t pt-3">
        <p className="text-xs leading-5 text-muted-foreground">
          Verified steps for this response. Private model reasoning and tool
          data stay private.
        </p>
        <div className="space-y-3">
          {events.map((event, index) => (
            <ChainOfThoughtStep
              className={
                hasActiveTool && index === events.length - 1
                  ? "[&>div:first-child>div]:hidden"
                  : undefined
              }
              description={stepDescriptions[event.type]}
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
