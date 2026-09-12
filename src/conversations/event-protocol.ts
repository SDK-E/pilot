export type EventType =
  | "execution.started"
  | "execution.completed"
  | "execution.failed"
  | "execution.cancelled"
  | "text.checkpoint"
  | "user_input_required"
  | "user_input.resumed"
  | "suspended"
  | "artifact.ref"
  | "citation.ref"
  | "tool.summary"
  | "system";

export interface VersionedEvent {
  eventId: string;
  executionId: string;
  sequence: number;
  type: EventType;
  timestamp: Date;
  payload: EventPayload;
}

export type EventPayload =
  | { kind: "text_checkpoint"; text: string; checkpointId: string }
  | { kind: "execution_started"; workerId: string; modelId: string }
  | {
      kind: "execution_completed";
      finishReason: string;
      usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
      };
    }
  | { kind: "execution_failed"; error: string }
  | { kind: "execution_cancelled"; reason: string }
  | {
      kind: "user_input_required";
      questionId: string;
      question: string;
      options?: Array<{ label: string; description?: string }>;
      selectionMode?: "single_select" | "multi_select";
    }
  | { kind: "user_input_resumed"; questionId: string; answer: string }
  | { kind: "suspended"; runId: string; toolCallId: string; toolId: string }
  | { kind: "artifact_ref"; artifactId: string; label?: string }
  | { kind: "citation_ref"; sourceId: string }
  | { kind: "tool_summary"; toolId: string; summary: string }
  | { kind: "system"; message: string };

export function isControlEvent(event: VersionedEvent): boolean {
  const type = event.type;
  return (
    type.startsWith("execution.") ||
    type === "user_input_required" ||
    type === "user_input.resumed" ||
    type === "suspended"
  );
}

export function isDataEvent(event: VersionedEvent): boolean {
  return !isControlEvent(event);
}

export function eventTypeFromPayload(payload: EventPayload): EventType {
  switch (payload.kind) {
    case "text_checkpoint":
      return "text.checkpoint";
    case "execution_started":
      return "execution.started";
    case "execution_completed":
      return "execution.completed";
    case "execution_failed":
      return "execution.failed";
    case "execution_cancelled":
      return "execution.cancelled";
    case "user_input_required":
      return "user_input_required";
    case "user_input_resumed":
      return "user_input.resumed";
    case "suspended":
      return "suspended";
    case "artifact_ref":
      return "artifact.ref";
    case "citation_ref":
      return "citation.ref";
    case "tool_summary":
      return "tool.summary";
    case "system":
      return "system";
  }
}

export function validateEventSequence(events: VersionedEvent[]): {
  valid: boolean;
  gapIndex?: number;
  duplicateIndex?: number;
} {
  let expected = 0;
  for (let i = 0; i < events.length; i++) {
    const seq = events[i].sequence;
    if (seq < expected) {
      return { valid: false, duplicateIndex: i };
    }
    if (seq > expected) {
      return { valid: false, gapIndex: i };
    }
    expected = seq + 1;
  }
  return { valid: true };
}
