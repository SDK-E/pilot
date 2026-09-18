"use client";

import { useCompletion } from "@ai-sdk/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { activitiesSince, useActivityPolling } from "./use-activity-polling";
import { useBackgroundRunResync } from "./use-background-run-resync";
import { useInitialMessage } from "./use-initial-message";
import { useTranscript } from "./use-transcript";

import type {
  MessageSendOptions,
  PersistedActivity,
  PersistedMessage,
} from "./conversation-types";

export type { TransientTurn } from "./use-transcript";

// Must stay above the server's own STREAM_TIMEOUT_MS (conversation-turn.ts,
// 260s) plus a margin, and below this Vercel plan's hard maxDuration ceiling
// (300s, stream/route.ts) — otherwise the client aborts a turn that's still
// legitimately working (a tool call, a multi-step plan, or a chunk the
// server would otherwise have deferred and auto-continued — see ADR-0026)
// before the server's own timeout ever gets a chance to handle it and
// persist a resumable reply.
const RESPONSE_TIMEOUT_MS = 295_000;
// A stop needs the server's failTurn to persist the partial reply before
// `sync` re-fetches the transcript; long enough for that round trip, short
// enough that the pause after clicking Stop isn't itself noticeable.
const STOP_SYNC_DELAY_MS = 5000;
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
  const { activities, backgroundRun } = useActivityPolling(
    conversationId,
    input.initialActivities,
    isLoading,
  );
  useBackgroundRunResync(backgroundRun, isLoading, transcript.sync);

  const send = useCallback(
    (raw: string, options: MessageSendOptions = {}) => {
      const prompt = raw.trim();
      if (!prompt || isLoading) return;
      lastPrompt.current = prompt;
      setStreamStartedAt(Date.now());
      setPendingPrompt(prompt);
      setCompletion("");
      setInput("");
      setStreamError(undefined);
      setTimeoutError(undefined);
      void complete(prompt, { body: { mode: "send", ...options } });
    },
    [complete, isLoading, setCompletion, setInput],
  );

  const editMessage = useCallback(
    (messageId: string, content: string, options: MessageSendOptions = {}) => {
      const prompt = content.trim();
      if (!prompt || isLoading) return;
      transcript.truncateFrom(messageId);
      lastPrompt.current = prompt;
      setStreamStartedAt(Date.now());
      setPendingPrompt(prompt);
      setCompletion("");
      setStreamError(undefined);
      setTimeoutError(undefined);
      void complete(prompt, { body: { mode: "edit", messageId, ...options } });
    },
    [complete, isLoading, setCompletion, transcript],
  );

  // Regenerate and continue both resend without any new user-typed prompt —
  // the only difference is which existing message the reply lands on.
  const startWithoutPrompt = useCallback(
    (mode: "regenerate" | "continue", messageId: string) => {
      if (isLoading) return;
      lastPrompt.current = "";
      setStreamStartedAt(Date.now());
      setPendingPrompt(undefined);
      setCompletion("");
      setStreamError(undefined);
      setTimeoutError(undefined);
      void complete("", { body: { mode, messageId } });
    },
    [complete, isLoading, setCompletion],
  );

  const regenerate = useCallback(
    (messageId: string) => {
      transcript.truncateFrom(messageId);
      startWithoutPrompt("regenerate", messageId);
    },
    [startWithoutPrompt, transcript],
  );

  const continueMessage = useCallback(
    (messageId: string) => {
      startWithoutPrompt("continue", messageId);
    },
    [startWithoutPrompt],
  );

  // The visible partial text is left in place — cleared only once `sync`
  // brings back the persisted, resumable version of it — rather than wiped
  // immediately, which would flash the reply away before it reappears.
  const cancel = useCallback(() => {
    stop();
    // The client abort above only stops compute if this same tab is still
    // the one holding the request open. Every agent kind now has a durable
    // run record (see ADR-0025/ADR-0026), so also ask the server to close it
    // immediately (rather than waiting for its stale-run reaper), so the
    // conversation is free for a new turn right away even if the original
    // request can't be reached from here — see ADR-0025's cancellation
    // section for what this does and does not guarantee.
    void fetch(`/api/conversations/${conversationId}/cancel`, {
      method: "POST",
    }).catch(() => {
      // Best-effort: the stale-run reaper is the fallback if this fails.
    });
    setTimeoutError(undefined);
    setInput("");
    setTimeout(() => {
      setCompletion("");
      finishTurn();
    }, STOP_SYNC_DELAY_MS);
  }, [conversationId, finishTurn, setCompletion, setInput, stop]);

  const restoreLastPrompt = useCallback(() => {
    cancel();
    setStreamError(undefined);
    setInput(lastPrompt.current ?? "");
  }, [cancel, setInput]);

  useInitialMessage(conversationId, send);

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
    // Still genuinely in progress even though the fetch stream itself has
    // closed — a deferred turn (ADR-0026) resuming via
    // `/api/cron/continue-runs`. Kept separate from `isLoading` rather than
    // folded into it: `isLoading` also gates the live streaming-reply bubble,
    // which has nothing to resume into once the fetch that fed it is gone.
    isBackgroundRunning: backgroundRun !== null,
    send,
    editMessage,
    regenerate,
    continueMessage,
    cancel,
    restoreLastPrompt,
    streamError: streamError ?? completionState.error?.message,
    timeoutError,
  };
}
