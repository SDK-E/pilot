"use client";

import { RiDeleteBinLine } from "@remixicon/react";
import { useActionState } from "react";

import { deleteCommandAction } from "@/app/(workspace)/commands/actions";
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
import { Button } from "@/components/ui/button";

import type { CommandFormState } from "@/commands/command-form-state";

const initialState: CommandFormState = { status: "idle" };

export function DeleteCommandButton({
  commandId,
  name,
}: {
  commandId: string;
  name: string;
}) {
  const [state, action, pending] = useActionState(
    deleteCommandAction,
    initialState,
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button aria-label={`Delete ${name}`} size="icon" variant="ghost">
          <RiDeleteBinLine className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            No longer selectable from the composer&apos;s command palette.
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
            <input name="commandId" type="hidden" value={commandId} />
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "Deleting…" : "Delete command"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
