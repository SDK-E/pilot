"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, SendHorizontal } from "lucide-react";
import { startChatWithMessageAction } from "@/app/workspace/worker-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState = { status: "idle" as const };

type AgentOption = {
  id: string;
  name: string;
  baseAgentId: string;
};

export function NewChatForm({ agents }: { agents: AgentOption[] }) {
  const [state, action, pending] = useActionState(
    startChatWithMessageAction,
    initialState,
  );
  const router = useRouter();
  const conversationalAgents = agents.filter(
    (agent) => agent.baseAgentId === "conversational",
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
    conversationalAgents[0]?.id,
  );
  useEffect(() => {
    if (state.href) router.push(state.href);
  }, [router, state.href]);
  return (
    <form
      action={action}
      className="mx-auto w-full max-w-3xl space-y-3 text-left"
    >
      <input name="workerId" type="hidden" value={selectedAgentId ?? ""} />
      <div
        className="flex flex-wrap justify-center gap-2"
        aria-label="Choose an agent"
      >
        {conversationalAgents.length === 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground">
            <Bot className="size-3.5 text-primary" aria-hidden="true" />
            Pilot
          </span>
        ) : (
          conversationalAgents.map((agent) => {
            const selected = selectedAgentId === agent.id;
            return (
              <Button
                key={agent.id}
                aria-pressed={selected}
                className="rounded-full"
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
        <Button
          className="rounded-full"
          disabled
          size="sm"
          type="button"
          variant="outline"
        >
          <Bot className="size-3.5" aria-hidden="true" />
          Research · coming soon
        </Button>
      </div>
      <Textarea
        name="message"
        aria-label="Message Pilot"
        placeholder="Message Pilot…"
        required
        rows={3}
        maxLength={10_000}
        className="min-h-32 resize-y rounded-2xl border-border bg-card px-4 py-4 text-base shadow-lg shadow-black/10 focus-visible:ring-2"
      />
      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <div className="flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="size-3.5 text-primary" aria-hidden="true" />
          {conversationalAgents.find((agent) => agent.id === selectedAgentId)
            ?.name ?? "Pilot"}
        </span>
        <Button size="icon" type="submit" disabled={pending}>
          <SendHorizontal className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </form>
  );
}
