"use client";

import { useActionState } from "react";
import { sendConversationMessageAction } from "@/app/workspace/workers/[workerId]/conversations/[conversationId]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState = { status: "idle" as const };

export function ConversationMessageForm({
  workerId,
  conversationId,
}: {
  workerId: string;
  conversationId: string;
}) {
  const [state, action, pending] = useActionState(
    sendConversationMessageAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      <input name="workerId" type="hidden" value={workerId} />
      <input name="conversationId" type="hidden" value={conversationId} />
      <Textarea
        name="message"
        maxLength={10_000}
        placeholder="Message this worker"
        required
        rows={4}
      />
      {state.message ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
