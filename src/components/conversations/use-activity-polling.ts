"use client";

import { useEffect, useRef, useState } from "react";

import { readJson } from "@/lib/read-json";

import type {
  PersistedActivity,
  PersistedAgentRun,
} from "./conversation-types";

const ACTIVITY_POLL_MS = 400;

/**
 * While a reply streams, refreshes the sanitized activity trail at a fast
 * interval so the user can watch the agent's steps as they happen, including
 * short-lived tool calls that would otherwise complete between two slower
 * polls and never visibly appear. The stream itself is authoritative; polling
 * is best effort and stops once neither the local stream nor a background
 * agent run (see below) is still active.
 *
 * A turn deferred mid-chunk (ADR-0026's `needs_continuation`) closes the
 * client's fetch stream cleanly — `isStreaming` goes false — well before the
 * turn is actually done; `/api/cron/continue-runs` keeps working it in the
 * background, possibly for further chunks. Each poll response's `workRun`
 * reflects that: non-null for as long as the run is genuinely still
 * non-terminal. Polling keeps itself alive off that field directly (not off
 * a snapshot taken when the effect last ran), so a turn's activity — and the
 * fact that it's still going at all — stays visible across the entire
 * deferred/resumed gap, not just the first chunk.
 */
export function useActivityPolling(
  conversationId: string,
  initialActivities: PersistedActivity[],
  isStreaming: boolean,
) {
  const [activities, setActivities] = useState(initialActivities);
  const [backgroundRun, setBackgroundRun] = useState<PersistedAgentRun | null>(
    null,
  );
  const isStreamingRef = useRef(isStreaming);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = (shouldContinue: boolean) => {
      if (isCancelled || !shouldContinue) return;
      timeoutId = setTimeout(() => void poll(), ACTIVITY_POLL_MS);
    };

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/activity`,
          { cache: "no-store" },
        );
        if (isCancelled) return;
        if (!response.ok) {
          scheduleNext(isStreamingRef.current);
          return;
        }
        const payload = await readJson<{
          activities?: PersistedActivity[];
          workRun?: PersistedAgentRun | null;
        }>(response);
        if (payload.activities) setActivities(payload.activities);
        const workRun = payload.workRun ?? null;
        setBackgroundRun(workRun);
        scheduleNext(isStreamingRef.current || workRun !== null);
      } catch {
        // Best effort: see above.
        scheduleNext(isStreamingRef.current);
      }
    };

    void poll();
    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [conversationId, isStreaming]);

  return { activities, backgroundRun };
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
