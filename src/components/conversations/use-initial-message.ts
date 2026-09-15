"use client";

import { startTransition, useEffect } from "react";

/**
 * The start screen stores the first message in sessionStorage before
 * navigating here; this sends it once the conversation stream is ready.
 */
export function useInitialMessage(
  conversationId: string,
  send: (message: string) => void,
) {
  useEffect(() => {
    const key = `pilot:initial-message:${conversationId}`;
    const initialMessage = sessionStorage.getItem(key);
    if (!initialMessage) return;
    sessionStorage.removeItem(key);
    startTransition(() => {
      send(initialMessage);
    });
  }, [conversationId, send]);
}
