"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
import { ArrowLeft, Bot, SendHorizontal, Square } from "lucide-react";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ConversationDetailsPanel } from "@/components/conversations/conversation-details-panel";
import { useSendMessageShortcut } from "@/components/conversations/composer-preferences";
import { LiveConversationActivity } from "@/components/conversations/live-conversation-activity";
import type { ActivityEventType } from "@/executions/activity-event";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { shouldSubmitMessage } from "@/hooks/use-message-submit-shortcut";

type PersistedMessage = {
  id: string;
  role: "user" | "worker";
  content: string;
};

type PersistedActivity = {
  id: string;
  conversationMessageId: string | null;
  summary: string;
  type: ActivityEventType;
};

type ConversationShellProps = {
  backHref: string;
  conversationId: string;
  messages: PersistedMessage[];
  activities: PersistedActivity[];
  runtimeConfigured: boolean;
  title: string;
  agentId: string;
  agentName: string;
  tasks: Array<{ id: string; title: string; status: string }>;
  approvals: Array<{ id: string; summary: string; status: string }>;
};

export function ConversationShell({
  backHref,
  conversationId,
  messages,
  activities,
  runtimeConfigured,
  title,
  agentId,
  agentName,
  tasks,
  approvals,
}: ConversationShellProps) {
  const router = useRouter();
  const sendMessageShortcut = useSendMessageShortcut();
  const [pendingUserMessage, setPendingUserMessage] = useState<string>();
  const [liveActivities, setLiveActivities] = useState(activities);
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
    api: `/api/conversations/${conversationId}/stream`,
    body: { workerId: agentId },
    experimental_throttle: 50,
    streamProtocol: "text",
    onError: () => {
      setPendingUserMessage(undefined);
      router.refresh();
    },
    onFinish: () => {
      setCompletion("");
      setPendingUserMessage(undefined);
      router.refresh();
    },
  });
  const handleTaskCreated = useCallback(() => router.refresh(), [router]);
  const submitMessage = useCallback(() => {
    const message = input.trim();
    if (!message || isLoading) return;
    setPendingUserMessage(message);
    setCompletion("");
    setInput("");
    void complete(message);
  }, [complete, input, isLoading, setCompletion, setInput]);

  useEffect(() => {
    if (!isLoading) return;

    let cancelled = false;
    const refreshActivities = async () => {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/activity`,
          { cache: "no-store" },
        );
        if (!response.ok || cancelled) return;
        const payload: { activities?: PersistedActivity[] } =
          await response.json();
        if (payload.activities && !cancelled) {
          setLiveActivities(payload.activities);
        }
      } catch {
        // The stream is still authoritative; activity polling is best effort.
      }
    };

    void refreshActivities();
    const interval = window.setInterval(() => void refreshActivities(), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [conversationId, isLoading]);

  return (
    <main className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Chats</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-center">
          <AgentAvatar name={agentName} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{agentName}</p>
            <p className="truncate text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
        <div className="w-12" aria-hidden="true" />
      </header>

      <section className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <Conversation className="min-h-0 min-w-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-8 px-5 py-8 sm:px-8 sm:py-12">
            {messages.length === 0 ? (
              <ConversationEmptyState
                className="min-h-[min(52svh,34rem)]"
                description={`Start with a clear objective, context, or question for ${agentName}.`}
                icon={<Bot className="size-7" aria-hidden="true" />}
                title={`How can ${agentName} help?`}
              />
            ) : (
              messages.map((message) => {
                const from = message.role === "user" ? "user" : "assistant";

                return (
                  <Message from={from} key={message.id}>
                    <MessageContent>
                      {from === "assistant" ? (
                        <MessageResponse>{message.content}</MessageResponse>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </MessageContent>
                  </Message>
                );
              })
            )}
            {pendingUserMessage ? (
              <Message from="user">
                <MessageContent>
                  <p className="whitespace-pre-wrap">{pendingUserMessage}</p>
                </MessageContent>
              </Message>
            ) : null}
            {pendingUserMessage ? (
              <Message from="assistant">
                <MessageContent>
                  {completion ? (
                    <MessageResponse>{completion}</MessageResponse>
                  ) : null}
                  {isLoading ? (
                    <LiveConversationActivity events={liveActivities} />
                  ) : null}
                </MessageContent>
              </Message>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <ConversationDetailsPanel
          activities={liveActivities}
          agentId={agentId}
          approvals={approvals}
          conversationId={conversationId}
          onTaskCreated={handleTaskCreated}
          tasks={tasks}
        />
      </section>

      <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 sm:pb-6">
        <div className="mx-auto w-full max-w-3xl">
          {runtimeConfigured ? (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage();
              }}
            >
              <Textarea
                aria-label="Message"
                className="min-h-28 resize-y rounded-2xl border-border bg-card px-4 py-3 shadow-lg shadow-black/10 focus-visible:ring-2"
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
                <p aria-live="polite" className="text-sm text-destructive">
                  {error.message || "Pilot could not complete this message."}
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-3 px-1">
                <p
                  aria-live="polite"
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Bot className="size-3.5 text-primary" aria-hidden="true" />
                  {isLoading
                    ? "Pilot is responding…"
                    : "Pilot can make mistakes. Check important work."}
                </p>
                {isLoading ? (
                  <Button
                    aria-label="Stop generating"
                    onClick={stop}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Square
                      aria-hidden="true"
                      className="size-3.5 fill-current"
                    />
                  </Button>
                ) : (
                  <Button size="icon" type="submit">
                    <SendHorizontal aria-hidden="true" className="size-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
              Messaging becomes available after this environment is connected to
              Pilot AI.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
