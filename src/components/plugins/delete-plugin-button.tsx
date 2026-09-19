"use client";

import { RiDeleteBinLine } from "@remixicon/react";
import { useActionState } from "react";

import { deletePluginAction } from "@/app/(workspace)/plugins/actions";
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

import type { PluginFormState } from "@/plugins/plugin-form-state";

const initialState: PluginFormState = { status: "idle" };

export function DeletePluginButton({
  pluginId,
  name,
}: {
  pluginId: string;
  name: string;
}) {
  const [state, action, pending] = useActionState(
    deletePluginAction,
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
            No longer grantable to an agent. Any agent it was already granted to
            loses the tools it grants.
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
            <input name="pluginId" type="hidden" value={pluginId} />
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "Deleting…" : "Delete plugin"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
