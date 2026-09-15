"use client";

import { useEffect, useState } from "react";

import { readJson } from "@/lib/read-json";

import type { PersistedActivity } from "./conversation-types";

const ACTIVITY_POLL_MS = 400;

/**
 * While a reply streams, refreshes the sanitized activity trail at a fast
 * interval so the user can watch the agent's steps as they happen, including
 * short-lived tool calls that would otherwise complete between two slower
 * polls and never visibly appear. The stream itself is authoritative; polling
 * is best effort and stops as soon as the stream ends.
 */
export function useActivityPolling(
  conversationId: string,
  initialActivities: PersistedActivity[],
  isStreaming: boolean,
) {
  const [activities, setActivities] = useState(initialActivities);

  useEffect(() => {
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

    if (!isStreaming) {
      // The interval below can stop one tick before the terminal event
      // (execution.completed/failed) lands, leaving a step showing as still
      // in progress. One more fetch right as streaming ends catches it.
      void refresh();
      return () => {
        isCancelled = true;
      };
    }

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
