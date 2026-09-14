"use client";

import { RiPencilLine } from "@remixicon/react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  renameConversationAction,
  type ActionState,
} from "@/app/(workspace)/[mode]/[conversationId]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const initialState: ActionState = { status: "idle" };

export function RenameConversationForm({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    renameConversationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    form.current?.reset();
    startTransition(() => {
      setOpen(false);
    });
  }, [state.status]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          aria-label="Rename conversation"
          size="icon"
          type="button"
          variant="ghost"
        >
          <RiPencilLine aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
          <DialogDescription>
            Choose a name that makes this private chat easier to find.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4" ref={form}>
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
          <DialogFooter>
            <Button disabled={pending} type="submit">
              {pending ? "Saving…" : "Save title"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
