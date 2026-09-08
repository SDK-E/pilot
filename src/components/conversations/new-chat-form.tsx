"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCompletion } from "@ai-sdk/react";
import { Bot, Check, SendHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

export function NewChatForm({
  agents,
  defaultAgentId,
}: {
  agents: AgentOption[];
  defaultAgentId: string | null;
}) {
  const router = useRouter();
  const sendMessageShortcut = useSendMessageShortcut();
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
  const conversationHref = useRef<string | undefined>(undefined);
  const {
    complete,
    completion,
    error,
    input,
    isLoading,
    setCompletion,
    setInput,
    stop,
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
      setPendingPrompt(undefined);
      if (conversationHref.current) router.push(conversationHref.current);
    },
    onFinish: () => {
      if (conversationHref.current) router.push(conversationHref.current);
    },
  });
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
  const submitMessage = () => {
    const prompt = input.trim();
    if (!prompt || isLoading) return;
    conversationHref.current = undefined;
    setActivityConversationId(undefined);
    setLiveActivities([]);
    setPendingPrompt(prompt);
    setCompletion("");
    setInput("");
    void complete(prompt);
  };

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
        if (payload.activities && !cancelled) {
          setLiveActivities(payload.activities);
        }
      } catch {
        // The response stream remains useful even when activity polling fails.
      }
    };

    void refreshActivities();
    const interval = window.setInterval(() => void refreshActivities(), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activityConversationId, isLoading]);

  if (agents.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card/35 p-6 text-center">
        <Bot className="mx-auto size-5 text-primary" aria-hidden="true" />
        <h2 className="mt-3 font-medium">Create a persona to begin</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personas set the base agent, instructions, goals, and safe tool
          preferences for your organization.
        </p>
        <Button asChild className="mt-4">
          <Link href="/workspace/personas">Create persona</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 text-left">
      <div
        className="flex flex-wrap justify-center gap-2"
        aria-label="Choose an agent"
      >
        {agents.map((agent) => {
          const selected = selectedAgentId === agent.id;
          return (
            <Button
              key={agent.id}
              aria-pressed={selected}
              className="rounded-full"
              disabled={isLoading}
              onClick={() => setSelectedAgentId(agent.id)}
              size="sm"
              type="button"
              variant={selected ? "secondary" : "outline"}
            >
              {selected ? (
                <Check className="size-3.5 text-primary" aria-hidden="true" />
              ) : (
                <Bot className="size-3.5" aria-hidden="true" />
              )}
              {agent.name}
            </Button>
          );
        })}
      </div>
      {pendingPrompt ? (
        <section
          aria-live="polite"
          className="space-y-4 rounded-2xl border border-border bg-card/45 p-5 shadow-sm"
        >
          <p className="whitespace-pre-wrap text-sm">{pendingPrompt}</p>
          {completion ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {completion}
            </p>
          ) : null}
          {isLoading ? (
            <LiveConversationActivity events={liveActivities} />
          ) : null}
        </section>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submitMessage();
        }}
      >
        <Textarea
          aria-label="Message Pilot"
          className="min-h-32 resize-y rounded-2xl border-border bg-card px-4 py-4 text-base shadow-lg shadow-black/10 focus-visible:ring-2"
          disabled={isLoading}
          maxLength={10_000}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (shouldSubmitMessage(event, sendMessageShortcut)) {
              event.preventDefault();
              submitMessage();
            }
          }}
          placeholder="Message Pilot…"
          required
          rows={3}
          value={input}
        />
        {error ? (
          <p className="text-sm text-destructive">
            {error.message || "Pilot could not complete this message."}
          </p>
        ) : null}
        <div className="flex items-center justify-between px-1">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="size-3.5 text-primary" aria-hidden="true" />
            {isLoading
              ? "Pilot is responding…"
              : (selectedAgent?.name ?? "Pilot")}
          </span>
          {isLoading ? (
            <Button
              aria-label="Stop generating"
              onClick={stop}
              size="icon"
              type="button"
              variant="outline"
            >
              <Square aria-hidden="true" className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button size="icon" type="submit">
              <SendHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
