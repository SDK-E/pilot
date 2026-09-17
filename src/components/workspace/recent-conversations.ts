import { AGENT_KINDS } from "@/agents/agent-kinds";

import type { RecentConversation } from "@/components/workspace/workspace-shell";

const RECENT_GROUPS = [
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Previous 30 days",
  "Older",
] as const;

type RecentGroupLabel = (typeof RECENT_GROUPS)[number];

function recentGroupLabel(updatedAt: string): RecentGroupLabel {
  const updated = new Date(updatedAt);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const daysAgo = Math.floor(
    (startOfToday.getTime() - updated.getTime()) / dayMs,
  );
  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo <= 7) return "Previous 7 days";
  if (daysAgo <= 30) return "Previous 30 days";
  return "Older";
}

export function groupRecentConversations(
  conversations: RecentConversation[],
): { label: RecentGroupLabel; conversations: RecentConversation[] }[] {
  const groups = new Map<RecentGroupLabel, RecentConversation[]>();
  for (const conversation of conversations) {
    const label = recentGroupLabel(conversation.updatedAt);
    const existing = groups.get(label);
    if (existing) {
      existing.push(conversation);
    } else {
      groups.set(label, [conversation]);
    }
  }
  return RECENT_GROUPS.filter((label) => groups.has(label)).map((label) => ({
    label,
    conversations: groups.get(label) ?? [],
  }));
}

export function conversationLabel(conversation: RecentConversation): string {
  if (conversation.title) return conversation.title;
  if (conversation.preview) return conversation.preview;
  return `New ${AGENT_KINDS[conversation.kind].name.toLowerCase()}`;
}
