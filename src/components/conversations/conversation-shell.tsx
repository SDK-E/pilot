"use client";

import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
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
import { ConversationMessageForm } from "@/components/conversations/conversation-message-form";
import { ConversationActivity } from "@/components/conversations/conversation-activity";

type PersistedMessage = {
  id: string;
  role: "user" | "worker";
  content: string;
};

type PersistedActivity = {
  id: string;
  conversationMessageId: string | null;
  summary: string;
  type: "execution.started" | "execution.completed" | "execution.failed";
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
}: ConversationShellProps) {
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
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-medium">{agentName}</p>
          <p className="truncate text-xs text-muted-foreground">{title}</p>
        </div>
        <div className="w-12" aria-hidden="true" />
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <Conversation className="min-h-0">
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
                const messageActivities = activities.filter(
                  (activity) => activity.conversationMessageId === message.id,
                );

                return (
                  <Message from={from} key={message.id}>
                    <MessageContent>
                      {from === "assistant" ? (
                        <MessageResponse>{message.content}</MessageResponse>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </MessageContent>
                    {from === "assistant" ? (
                      <ConversationActivity events={messageActivities} />
                    ) : null}
                  </Message>
                );
              })
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 sm:pb-6">
          <div className="mx-auto w-full max-w-3xl">
            {runtimeConfigured ? (
              <ConversationMessageForm
                conversationId={conversationId}
                agentId={agentId}
              />
            ) : (
              <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
                Messaging becomes available after this environment is connected
                to Pilot AI.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
