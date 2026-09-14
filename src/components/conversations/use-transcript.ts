"use client";

import { useCallback, useState } from "react";

import { readJson } from "@/lib/read-json";

import type { PersistedMessage } from "./conversation-types";

export interface TransientTurn {
  id: string;
  prompt: string;
  completion: string;
  error?: string;
}

/**
 * The transcript of an open conversation: the persisted messages plus the
 * turns streamed in this visit. Once a turn is saved on the server, syncing
 * replaces the local copies with the persisted messages.
 */
export function useTranscript(
  conversationId: string,
  initialMessages: PersistedMessage[],
) {
  const [messages, setMessages] = useState(initialMessages);
  const [transientTurns, setTransientTurns] = useState<TransientTurn[]>([]);

  const keepTurn = useCallback(
    (prompt: string, completion: string, error?: string) => {
      setTransientTurns((current) => {
        const last = current.at(-1);
        // A retry of the same message that failed again replaces the prior
        // failed turn instead of stacking up another silent duplicate.
        if (last?.error && last.prompt === prompt) {
          return [...current.slice(0, -1), { ...last, completion, error }];
        }
        return [
          ...current,
          { id: `${Date.now()}-${current.length}`, prompt, completion, error },
        ];
      });
    },
    [],
  );

  const sync = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const payload = await readJson<{ messages?: PersistedMessage[] }>(
        response,
      );
      if (payload.messages) {
        setMessages(payload.messages);
        setTransientTurns([]);
      }
    } catch {
      // The streamed turn stays visible locally until the next visit.
    }
  }, [conversationId]);

  return { messages, transientTurns, keepTurn, sync };
}
