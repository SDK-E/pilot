"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { startChatWithMessageAction } from "@/app/workspace/worker-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState = { status: "idle" as const };

export function NewChatForm() {
  const [state, action, pending] = useActionState(
    startChatWithMessageAction,
    initialState,
  );
  const router = useRouter();
  useEffect(() => {
    if (state.href) router.push(state.href);
  }, [router, state.href]);
  return (
    <form
      action={action}
      className="mx-auto w-full max-w-2xl space-y-2 text-left"
    >
      <Textarea
        name="message"
        aria-label="Message Pilot"
        placeholder="Message Pilot…"
        required
        rows={3}
        maxLength={10_000}
        className="min-h-28 rounded-2xl bg-muted/40 px-4 py-3"
      />
      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button size="icon" type="submit" disabled={pending}>
          <SendHorizontal className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </form>
  );
}
