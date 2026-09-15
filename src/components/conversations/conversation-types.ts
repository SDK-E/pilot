import type { TimelineActivity } from "@/executions/activity-timeline";

export interface PersistedMessage {
  id: string;
  role: "user" | "worker";
  content: string;
  isError?: boolean;
  isPartial?: boolean;
  userQuestionOptions?: { label: string; description?: string }[] | null;
  userQuestionSelectionMode?: "single_select" | "multi_select" | null;
  sources?: { title: string; domain: string; url: string; summary: string }[];
}

export type PersistedActivity = TimelineActivity & {
  conversationMessageId: string | null;
};

/**
Panel ids of the conversation page, as the resizable group reports them.
*/
export type PanelLayout = Record<string, number> & {
  conversation: number;
  details: number;
};
