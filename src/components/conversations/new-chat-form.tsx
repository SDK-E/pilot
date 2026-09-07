"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
import { Bot, Check, SendHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LiveConversationActivity } from "@/components/conversations/live-conversation-activity";

type AgentOption = {
  id: string;
  name: string;
  baseAgentId: string;
};

export function NewChatForm({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
    agents[0]?.id,
  );
  const [pendingPrompt, setPendingPrompt] = useState<string>();
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
      conversationHref.current =
        response.headers.get("x-pilot-conversation-href") ?? undefined;
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 text-left">
      <div
        className="flex flex-wrap justify-center gap-2"
        aria-label="Choose an agent"
      >
        {agents.length === 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground">
            <Bot className="size-3.5 text-primary" aria-hidden="true" />
            Pilot
          </span>
        ) : (
          agents.map((agent) => {
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
          })
        )}
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
          {isLoading ? <LiveConversationActivity /> : null}
        </section>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const prompt = input.trim();
          if (!prompt || isLoading) return;
          conversationHref.current = undefined;
          setPendingPrompt(prompt);
          setCompletion("");
          setInput("");
          void complete(prompt);
        }}
      >
        <Textarea
          aria-label="Message Pilot"
          className="min-h-32 resize-y rounded-2xl border-border bg-card px-4 py-4 text-base shadow-lg shadow-black/10 focus-visible:ring-2"
          disabled={isLoading}
          maxLength={10_000}
          onChange={(event) => setInput(event.target.value)}
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
