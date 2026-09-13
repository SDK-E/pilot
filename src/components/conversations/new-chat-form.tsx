"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCompletion } from "@ai-sdk/react";
import { Bot, Check, Globe2 } from "lucide-react";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { LiveConversationActivity } from "@/components/conversations/live-conversation-activity";
import { useSendMessageShortcut } from "@/components/conversations/composer-preferences";
import type { ActivityEventType } from "@/executions/activity-event";
import { shouldSubmitMessage } from "@/hooks/use-message-submit-shortcut";

type AgentOption = {
  id: string;
  name: string;
  baseAgentId: string;
};

type Activity = { id: string; summary: string; type: ActivityEventType };

const promptSuggestions = [
  "Help me plan a project",
  "Research a topic with sources",
  "Draft something with me",
] as const;

export function NewChatForm({
  agents,
  defaultAgentId,
  mode,
}: {
  agents: AgentOption[];
  defaultAgentId: string | null;
  mode?: string;
}) {
  const router = useRouter();
  const sendMessageShortcut = useSendMessageShortcut();
  const textareaId = useId();
  const fieldErrorId = useId();
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
    defaultAgentId && agents.some((agent) => agent.id === defaultAgentId)
      ? defaultAgentId
      : agents[0]?.id,
  );
  const [pendingPrompt, setPendingPrompt] = useState<string>();
  const [activityConversationId, setActivityConversationId] = useState<
    string | undefined
  >();
  const [liveActivities, setLiveActivities] = useState<Activity[]>([]);
  const [validationError, setValidationError] = useState<string>();
  const [timeoutError, setTimeoutError] = useState<string>();
  const conversationHref = useRef<string | undefined>(undefined);
  const wasLoadingRef = useRef(false);
  const submissionInProgressRef = useRef(false);
  const timedOutRef = useRef(false);
  const lastPromptRef = useRef<string>("");
  const {
    complete,
    completion,
    error,
    input,
    setCompletion,
    setInput,
    stop,
    isLoading,
  } = useCompletion<{ workerId: string }>({
    api: "/api/conversations/stream",
    body: { workerId: selectedAgentId ?? "" },
    experimental_throttle: 50,
    streamProtocol: "text",
    fetch: async (...args) => {
      const response = await fetch(...args);
      const href =
        response.headers.get("x-pilot-conversation-href") ?? undefined;
      conversationHref.current = href;
      setActivityConversationId(
        href?.match(/\/conversations\/([0-9a-f-]{36})$/i)?.[1],
      );
      return response;
    },
    onError: () => {
      submissionInProgressRef.current = false;
      setPendingPrompt(undefined);
      setCompletion("");
    },
    onFinish: () => {
      submissionInProgressRef.current = false;
      setPendingPrompt(undefined);
      setCompletion("");
    },
  });

  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true;
      timedOutRef.current = false;
      const handle = window.setTimeout(() => {
        timedOutRef.current = true;
        setTimeoutError(
          "Generation timed out. The request took longer than expected.",
        );
        stop();
      }, 60_000);
      return () => window.clearTimeout(handle);
    }

    if (!wasLoadingRef.current) return;
    wasLoadingRef.current = false;
    if (timedOutRef.current) return;
    if (conversationHref.current) {
      router.push(conversationHref.current);
      router.refresh();
    }
  }, [isLoading, router, stop]);

  useEffect(() => {
    if (!mode) return;
    const templates: Record<string, string> = {
      plan: "Help me plan: ",
      draft: "Help me draft: ",
      research: "Research: ",
    };
    if (templates[mode]) setInput(templates[mode]);
  }, [mode, setInput]);

  useEffect(() => {
    if (!isLoading || !activityConversationId) return;

    let cancelled = false;
    const refreshActivities = async () => {
      try {
        const response = await fetch(
          `/api/conversations/${activityConversationId}/activity`,
          { cache: "no-store" },
        );
        if (!response.ok || cancelled) return;
        const payload: { activities?: Activity[] } = await response.json();
        if (payload.activities && !cancelled)
          setLiveActivities(payload.activities);
      } catch {
        // The response stream remains useful when this best-effort refresh fails.
      }
    };

    void refreshActivities();
    const interval = window.setInterval(() => void refreshActivities(), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activityConversationId, isLoading]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  const focusComposer = () => {
    document.getElementById(textareaId)?.focus();
  };

  const submitMessage = (raw = input) => {
    const prompt = raw.trim();
    if (!prompt) {
      setValidationError("Message cannot be blank.");
      focusComposer();
      return;
    }
    if (isLoading || submissionInProgressRef.current) return;

    submissionInProgressRef.current = true;
    lastPromptRef.current = prompt;
    setValidationError(undefined);
    setTimeoutError(undefined);
    conversationHref.current = undefined;
    setActivityConversationId(undefined);
    setLiveActivities([]);
    setPendingPrompt(prompt);
    setCompletion("");
    setInput("");
    void complete(prompt);
  };

  const handleSubmit = (message: PromptInputMessage) => {
    submitMessage(message.text ?? "");
  };

  const retry = () => {
    setTimeoutError(undefined);
    if (lastPromptRef.current) submitMessage(lastPromptRef.current);
  };

  const cancel = () => {
    stop();
    setTimeoutError(undefined);
    setPendingPrompt(undefined);
    setCompletion("");
  };

  if (agents.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
        <Bot className="mx-auto size-5 text-primary" aria-hidden="true" />
        <h2 className="mt-4 font-medium">Create a persona to begin</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Personas set an agent’s goals, instructions, and available tools.
        </p>
        <Button asChild className="mt-5">
          <Link href="/workspace/personas">Create persona</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 text-left">
      {pendingPrompt ? (
        <section
          aria-live="polite"
          className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm"
        >
          <p className="whitespace-pre-wrap text-sm font-medium">
            {pendingPrompt}
          </p>
          {completion ? <MessageResponse>{completion}</MessageResponse> : null}
          {isLoading ? (
            <LiveConversationActivity events={liveActivities} />
          ) : null}
        </section>
      ) : null}

      <PromptInput
        className="rounded-3xl border-border bg-card p-2 shadow-xl shadow-foreground/[0.04]"
        onSubmit={handleSubmit}
      >
        <PromptInputBody>
          <PromptInputTextarea
            aria-describedby={validationError ? fieldErrorId : undefined}
            aria-invalid={validationError ? true : undefined}
            aria-label="Message Pilot"
            className="min-h-32 px-3 pt-3 text-[15px] leading-6"
            disabled={isLoading}
            id={textareaId}
            maxLength={10_000}
            onChange={(event) => {
              setInput(event.currentTarget.value);
              if (validationError) setValidationError(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing)
                return;
              if (shouldSubmitMessage(event, sendMessageShortcut)) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
                return;
              }
              if (sendMessageShortcut === "mod_enter" && !event.shiftKey) {
                event.preventDefault();
                const textarea = event.currentTarget;
                const next = `${textarea.value.slice(0, textarea.selectionStart)}\n${textarea.value.slice(textarea.selectionEnd)}`;
                setInput(next);
                requestAnimationFrame(() => {
                  const position = textarea.selectionStart + 1;
                  textarea.setSelectionRange(position, position);
                });
              }
            }}
            placeholder="Message Pilot…"
            required
            rows={3}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter className="px-2 pb-1">
          <PromptInputTools>
            <PromptInputSelect
              onValueChange={setSelectedAgentId}
              value={selectedAgentId}
            >
              <PromptInputSelectTrigger className="h-8 max-w-52 rounded-full border-0 bg-muted px-2.5 text-xs shadow-none">
                <AgentAvatar
                  className="size-4"
                  name={selectedAgent?.name ?? "Pilot"}
                />
                <PromptInputSelectValue placeholder="Choose an agent" />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {agents.map((agent) => (
                  <PromptInputSelectItem key={agent.id} value={agent.id}>
                    <span className="flex items-center gap-2">
                      <AgentAvatar className="size-4" name={agent.name} />
                      {agent.name}
                      {agent.id === selectedAgentId ? (
                        <Check
                          className="size-3.5 text-primary"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <Globe2 className="size-3.5" aria-hidden="true" />
              Web ready
            </span>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={!input.trim() && !isLoading}
            onStop={cancel}
            status={isLoading ? "streaming" : "ready"}
          />
        </PromptInputFooter>
      </PromptInput>

      {validationError ? (
        <p
          aria-live="assertive"
          className="px-2 text-sm text-destructive"
          id={fieldErrorId}
          role="alert"
        >
          {validationError}
        </p>
      ) : null}
      {timeoutError ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3">
          <p
            aria-live="assertive"
            className="text-sm text-destructive"
            role="alert"
          >
            {timeoutError}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button onClick={retry} size="sm" type="button">
              Retry
            </Button>
            <Button onClick={cancel} size="sm" type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {error && !timeoutError ? (
        <p aria-live="polite" className="px-2 text-sm text-destructive">
          {error.message || "Pilot could not complete this message."}
        </p>
      ) : null}

      {!pendingPrompt ? (
        <div className="flex flex-wrap justify-center gap-2 px-1">
          {promptSuggestions.map((suggestion) => (
            <Button
              className="rounded-full bg-muted px-3 text-xs font-normal text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              key={suggestion}
              onClick={() => {
                setInput(suggestion);
                focusComposer();
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      ) : null}

      <p className="px-2 text-center text-xs text-muted-foreground">
        {sendMessageShortcut === "enter"
          ? "Enter sends · Shift + Enter adds a line"
          : "Ctrl + Enter sends · Enter adds a line"}
      </p>
    </div>
  );
}
