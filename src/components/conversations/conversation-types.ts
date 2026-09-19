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
  /*
   * What was active on this turn — see `MessageSendOptions`.
   */
  skillIds?: string[];
  connectorToolIds?: string[] | null;
  attachments?: { id: string; filename: string }[];
}

/**
 * The composer's per-message connector toggle, skill picker, and attached
 * files, threaded through `send`/`editMessage` down to the stream route.
 * Omitted `connectorToolIds` means every available connector stays on.
 */
export interface MessageSendOptions {
  connectorToolIds?: string[];
  /**
   * Which individual connector slugs may be used this turn. Omitted means
   * every connector the acting user can use stays available.
   */
  connectorSlugs?: string[];
  skillIds?: string[];
  attachmentIds?: string[];
  requestedModelId?: string;
}

export type PersistedActivity = TimelineActivity & {
  conversationMessageId: string | null;
};

/**
 * The conversation's active agent run, as `getActiveAgentRun` returns it —
 * non-null while a turn is still genuinely in progress, including while
 * paused between chunks (`needs_continuation`) waiting for
 * `/api/cron/continue-runs` to resume it. See ADR-0026.
 */
export interface PersistedAgentRun {
  id: string;
  status: "running" | "cancelling" | "needs_continuation";
  stepCount: number;
  maxSteps: number;
  startedAt: string;
}

/**
Panel ids of the conversation page, as the resizable group reports them.
*/
export type PanelLayout = Record<string, number> & {
  conversation: number;
  details: number;
};
