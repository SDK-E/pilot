"use client";

import { useEffect, useState } from "react";

import { readJson } from "@/lib/read-json";

import type { PersistedActivity } from "./conversation-types";

const ACTIVITY_POLL_MS = 1000;

/**
 * While a reply streams, refreshes the sanitized activity trail every second
 * so the user can watch the agent's steps. The stream itself is authoritative;
 * polling is best effort and stops as soon as the stream ends.
 */
export function useActivityPolling(
  conversationId: string,
  initialActivities: PersistedActivity[],
  isStreaming: boolean,
) {
  const [activities, setActivities] = useState(initialActivities);

  useEffect(() => {
    if (!isStreaming) return;
    let isCancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/activity`,
          { cache: "no-store" },
        );
        if (isCancelled || !response.ok) return;
        const payload = await readJson<{ activities?: PersistedActivity[] }>(
          response,
        );
        if (payload.activities) setActivities(payload.activities);
      } catch {
        // Best effort: see above.
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), ACTIVITY_POLL_MS);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, isStreaming]);

  return activities;
}

/**
 * Only the activity recorded since the current stream started, with a small
 * allowance for clock skew between the browser and the server.
 */
export function activitiesSince(
  activities: PersistedActivity[],
  startedAt: number | undefined,
) {
  if (startedAt === undefined) return [];
  const earliest = startedAt - 1500;
  return activities.filter((activity) => {
    const timestamp = activity.createdAt
      ? new Date(activity.createdAt).getTime()
      : NaN;
    return Number.isFinite(timestamp) && timestamp >= earliest;
  });
}
