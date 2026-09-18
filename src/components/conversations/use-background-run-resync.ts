"use client";

import { useEffect, useRef } from "react";

import type { PersistedAgentRun } from "./conversation-types";

/**
 * A deferred turn (ADR-0026) closes the client's fetch stream well before
 * the turn is actually finished — `isLoading` alone can't tell "genuinely
 * done" from "paused between chunks." Once `backgroundRun` (still polled
 * after the stream closes, see useActivityPolling) drops back to null, the
 * run is actually over, so this resyncs the transcript to pick up its final
 * state without waiting for the user to reload or click Continue.
 */
export function useBackgroundRunResync(
  backgroundRun: PersistedAgentRun | null,
  isLoading: boolean,
  sync: () => Promise<void>,
) {
  const wasBackgroundRunning = useRef(false);

  useEffect(() => {
    if (backgroundRun) {
      wasBackgroundRunning.current = true;
      return;
    }
    if (isLoading || !wasBackgroundRunning.current) return;
    wasBackgroundRunning.current = false;
    void sync();
  }, [backgroundRun, isLoading, sync]);
}
