"use client";

import { useCompletion } from "@ai-sdk/react";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { activitiesSince, useActivityPolling } from "./use-activity-polling";
import { useTranscript } from "./use-transcript";

import type { PersistedActivity, PersistedMessage } from "./conversation-types";

export type { TransientTurn } from "./use-transcript";

const RESPONSE_TIMEOUT_MS = 60_000;
const TIMEOUT_MESSAGE =
  "The response timed out. The request may still have completed; review the message before sending it again.";

/**
 * Streams messages into a conversation. Text streams live; once the stream
 * closes the persisted transcript replaces the local turn. A first message
 * queued by the start screen is sent on mount.
 */
export function useConversationStream(input: {
  conversationId: string;
  initialMessages: PersistedMessage[];
  initialActivities: PersistedActivity[];
}) {
  const { conversationId } = input;
  const transcript = useTranscript(conversationId, input.initialMessages);
  const [pendingPrompt, setPendingPrompt] = useState<string>();
  const [streamStartedAt, setStreamStartedAt] = useState<number>();
  const [streamError, setStreamError] = useState<string>();
  const [timeoutError, setTimeoutError] = useState<string>();
  const lastPrompt = useRef<string>(undefined);

  const finishTurn = useCallback(() => {
    setPendingPrompt(undefined);
    setTimeoutError(undefined);
    setStreamStartedAt(undefined);
    void transcript.sync();
  }, [transcript]);

  const completionState = useCompletion({
    api: `/api/conversations/${conversationId}/stream`,
    experimental_throttle: 50,
    streamProtocol: "text",
    onError: (cause) => {
      const message = cause.message || "Pilot could not complete this message.";
      if (lastPrompt.current)
        transcript.keepTurn(lastPrompt.current, "", message);
      setStreamError(message);
      finishTurn();
    },
    onFinish: (prompt, finalCompletion) => {
      transcript.keepTurn(prompt, finalCompletion);
      completionState.setCompletion("");
      finishTurn();
    },
  });
  const { complete, isLoading, setCompletion, setInput, stop } =
    completionState;
  const activities = useActivityPolling(
    conversationId,
    input.initialActivities,
    isLoading,
  );

  const send = useCallback(
    (raw: string) => {
      const prompt = raw.trim();
      if (!prompt || isLoading) return;
      lastPrompt.current = prompt;
      setStreamStartedAt(Date.now());
      setPendingPrompt(prompt);
      setCompletion("");
      setInput("");
      setStreamError(undefined);
      setTimeoutError(undefined);
      void complete(prompt);
    },
    [complete, isLoading, setCompletion, setInput],
  );

  const cancel = useCallback(() => {
    stop();
    setTimeoutError(undefined);
    setPendingPrompt(undefined);
    setCompletion("");
    setInput("");
  }, [setCompletion, setInput, stop]);

  const restoreLastPrompt = useCallback(() => {
    cancel();
    setStreamError(undefined);
    setInput(lastPrompt.current ?? "");
  }, [cancel, setInput]);

  // The start screen stores the first message and opens the conversation.
  useEffect(() => {
    const key = `pilot:initial-message:${conversationId}`;
    const initialMessage = sessionStorage.getItem(key);
    if (!initialMessage) return;
    sessionStorage.removeItem(key);
    startTransition(() => {
      send(initialMessage);
    });
  }, [conversationId, send]);

  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => {
      setTimeoutError(TIMEOUT_MESSAGE);
      stop();
    }, RESPONSE_TIMEOUT_MS);
    return () => {
      clearTimeout(timeout);
    };
  }, [isLoading, stop]);

  return {
    messages: transcript.messages,
    activities,
    currentStreamActivities: activitiesSince(activities, streamStartedAt),
    transientTurns: transcript.transientTurns,
    pendingPrompt,
    completion: completionState.completion,
    draft: completionState.input,
    setDraft: setInput,
    isLoading,
    send,
    cancel,
    restoreLastPrompt,
    streamError: streamError ?? completionState.error?.message,
    timeoutError,
  };
}
