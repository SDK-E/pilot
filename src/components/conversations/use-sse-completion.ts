"use client";

import { useCallback, useRef, useState } from "react";

import { parseStreamEvents } from "@/conversations/stream-protocol";

/**
 * Reads this app's real `text/event-stream` wire format (see
 * `stream-protocol.ts`) to completion, reporting each text delta via
 * `onText`. Throws if the stream carried a graceful mid-stream error frame.
 */
async function readSseStream(
  response: Response,
  onText: (text: string) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Pilot could not complete this message.");
  const decoder = new TextDecoder();
  let buffer = "";
  let streamErrorMessage: string | undefined;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const parsed = parseStreamEvents(buffer);
    buffer = parsed.remainder;
    for (const event of parsed.events) {
      if (event.type === "text") onText(event.text);
      else streamErrorMessage = event.message;
    }
  }
  if (streamErrorMessage) throw new Error(streamErrorMessage);
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/**
 * A minimal, purpose-built replacement for `@ai-sdk/react`'s `useCompletion`
 * that speaks this app's own real `text/event-stream` wire format (see
 * `stream-protocol.ts`, ADR-0029) instead of a plain-text body — that
 * protocol has no place to carry a graceful mid-stream error frame, which is
 * exactly the gap this closes. Keeps the same external shape
 * (`complete`/`completion`/`input`/`setInput`/`isLoading`/`stop`/`error`)
 * `use-conversation-stream.ts` already depends on, so nothing above this
 * hook needed to change.
 */
export function useSseCompletion(input: {
  api: string;
  onError?: (error: Error) => void;
  onFinish?: (prompt: string, completion: string) => void;
}) {
  const { api, onError, onFinish } = input;
  const [completion, setCompletion] = useState("");
  const [draftInput, setDraftInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const controllerRef = useRef<AbortController>(undefined);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const complete = useCallback(
    async (prompt: string, options?: { body?: Record<string, unknown> }) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setError(undefined);
      setIsLoading(true);
      let text = "";
      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt, ...options?.body }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            (await readErrorBody(response)) ||
              "Pilot could not complete this message.",
          );
        }
        await readSseStream(response, (delta) => {
          text += delta;
          setCompletion(text);
        });
        setIsLoading(false);
        onFinish?.(prompt, text);
      } catch (error_) {
        if (controller.signal.aborted) {
          setIsLoading(false);
          return;
        }
        const asError =
          error_ instanceof Error ? error_ : new Error(String(error_));
        setError(asError);
        setIsLoading(false);
        onError?.(asError);
      }
    },
    [api, onError, onFinish],
  );

  return {
    complete,
    completion,
    setCompletion,
    input: draftInput,
    setInput: setDraftInput,
    isLoading,
    stop,
    error,
  };
}
