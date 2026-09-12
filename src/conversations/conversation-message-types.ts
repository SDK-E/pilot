export type MessagePartType =
  | "text"
  | "artifact_ref"
  | "citation_ref"
  | "tool_summary"
  | "user_question"
  | "unknown";

export interface TextPart {
  type: "text";
  content: string;
}

export interface ArtifactRefPart {
  type: "artifact_ref";
  artifactId: string;
  label?: string;
}

export interface CitationRefPart {
  type: "citation_ref";
  sourceId: string;
  position?: { start: number; end: number };
}

export interface ToolSummaryPart {
  type: "tool_summary";
  toolId: string;
  summary: string;
}

export interface UserQuestionPart {
  type: "user_question";
  questionId: string;
  answer?: string;
  validated?: boolean;
}

export interface UnknownPart {
  type: "unknown";
  tag: string;
  content: unknown;
}

export type MessagePart =
  | TextPart
  | ArtifactRefPart
  | CitationRefPart
  | ToolSummaryPart
  | UserQuestionPart
  | UnknownPart;

export type MessageStatus = "partial" | "complete" | "interrupted";

export interface ConversationMessageV2 {
  messageId: string;
  schemaVersion: number;
  status: MessageStatus;
  conversationId: string;
  organizationId: string;
  role: "user" | "worker";
  parts: MessagePart[];
  requestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function isKnownPart(part: MessagePart): boolean {
  return part.type !== "unknown";
}

export function getPartContent(part: MessagePart): string {
  switch (part.type) {
    case "text":
      return part.content;
    case "artifact_ref":
      return part.artifactId;
    case "citation_ref":
      return part.sourceId;
    case "tool_summary":
      return part.summary;
    case "user_question":
      return part.questionId;
    case "unknown":
      return typeof part.content === "string"
        ? part.content
        : JSON.stringify(part.content);
  }
}

export function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((p): p is TextPart => p.type === "text")
    .map((p) => p.content)
    .join("");
}
