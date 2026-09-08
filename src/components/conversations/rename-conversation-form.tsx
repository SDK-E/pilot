"use client";

import { useActionState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import {
  renameConversationAction,
  type RenameConversationState,
} from "@/app/workspace/chats/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: RenameConversationState = { status: "idle" };

export function RenameConversationForm({
  conversationId,
  title,
  workerId,
}: {
  conversationId: string;
  title: string;
  workerId: string;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const [state, action, pending] = useActionState(
    renameConversationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") details.current?.removeAttribute("open");
  }, [state.status]);

  return (
    <details ref={details} className="relative">
      <summary className="list-none">
        <Button
          aria-label="Rename conversation"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </Button>
      </summary>
      <form
        action={action}
        className="absolute right-0 top-10 z-10 w-72 space-y-2 rounded-xl border border-border bg-popover p-3 shadow-lg"
      >
        <input name="workerId" type="hidden" value={workerId} />
        <input name="conversationId" type="hidden" value={conversationId} />
        <Input
          aria-label="Conversation title"
          defaultValue={title}
          maxLength={200}
          name="title"
          required
        />
        {state.status === "error" ? (
          <p className="text-xs text-destructive">{state.message}</p>
        ) : null}
        <Button disabled={pending} size="sm" type="submit">
          {pending ? "Saving…" : "Save title"}
        </Button>
      </form>
    </details>
  );
}
