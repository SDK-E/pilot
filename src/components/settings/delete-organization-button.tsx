"use client";

import { RiDeleteBinLine } from "@remixicon/react";
import { useActionState } from "react";

import {
  deleteOrganizationAction,
  type DeleteOrganizationState,
} from "@/app/(workspace)/settings/actions";
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

const initialState: DeleteOrganizationState = { status: "idle" };

export function DeleteOrganizationButton({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const [state, action, pending] = useActionState(
    deleteOrganizationAction,
    initialState,
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" type="button" variant="destructive">
          <RiDeleteBinLine aria-hidden="true" /> Delete workspace
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete &ldquo;{organizationName}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the workspace for every member —
            conversations, agents, projects, and any verified domain. This
            can&apos;t be undone.
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
            <input name="organizationId" type="hidden" value={organizationId} />
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "Deleting…" : "Delete workspace"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
