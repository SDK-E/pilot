"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";

import {
  deleteConversationAction,
  renameConversationAction,
  type ActionState,
} from "@/app/(workspace)/[mode]/[conversationId]/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const initialState: ActionState = { status: "idle" };

export function RenameDialog({
  conversationId,
  title,
  isOpen,
  onOpenChange,
}: {
  conversationId: string;
  title: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    renameConversationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    form.current?.reset();
    startTransition(() => {
      onOpenChange(false);
    });
  }, [state.status, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
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

export function DeleteDialog({
  conversationId,
  isOpen,
  onOpenChange,
}: {
  conversationId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    deleteConversationAction,
    initialState,
  );

  return (
    <AlertDialog onOpenChange={onOpenChange} open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes this private chat, its messages, and its
            saved working context. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.status === "error" ? (
          <p aria-live="polite" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <form action={action}>
            <input name="conversationId" type="hidden" value={conversationId} />
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "Deleting…" : "Delete conversation"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
