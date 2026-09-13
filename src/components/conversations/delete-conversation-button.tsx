"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteConversationAction,
  type DeleteConversationState,
} from "@/app/workspace/chats/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const initialState: DeleteConversationState = { status: "idle" };

export function DeleteConversationButton({
  workerId,
  conversationId,
}: {
  workerId: string;
  conversationId: string;
}) {
  const [state, action, pending] = useActionState(
    deleteConversationAction,
    initialState,
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Delete conversation">
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
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
            <input name="workerId" type="hidden" value={workerId} />
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
