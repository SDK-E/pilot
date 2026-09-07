"use client";

import { useActionState } from "react";
import { Bot, SendHorizontal } from "lucide-react";
import { sendConversationMessageAction } from "@/app/workspace/workers/[workerId]/conversations/[conversationId]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState = { status: "idle" as const };

export function ConversationMessageForm({
  agentId,
  conversationId,
}: {
  agentId: string;
  conversationId: string;
}) {
  const [state, action, pending] = useActionState(
    sendConversationMessageAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-2">
      <input name="workerId" type="hidden" value={agentId} />
      <input name="conversationId" type="hidden" value={conversationId} />
      <Textarea
        aria-label="Message"
        className="min-h-28 resize-y rounded-2xl border-border bg-card px-4 py-3 shadow-lg shadow-black/10 focus-visible:ring-2"
        name="message"
        maxLength={10_000}
        placeholder="Message Pilot…"
        required
        rows={3}
      />
      {state.message ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      {pending ? (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Pilot is responding…
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="size-3.5 text-primary" aria-hidden="true" />
          Pilot can make mistakes. Check important work.
        </p>
        <Button size="icon" type="submit" disabled={pending}>
          <SendHorizontal aria-hidden="true" className="size-4" />
          <span className="sr-only">
            {pending ? "Sending" : "Send message"}
          </span>
        </Button>
      </div>
    </form>
  );
}
