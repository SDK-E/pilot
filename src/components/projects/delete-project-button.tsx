"use client";

import { RiDeleteBinLine } from "@remixicon/react";
import { useActionState } from "react";

import {
  deleteProjectAction,
  type DeleteProjectState,
} from "@/app/(workspace)/projects/actions";
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

const initialState: DeleteProjectState = { status: "idle" };

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    deleteProjectAction,
    initialState,
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <RiDeleteBinLine aria-hidden="true" /> Delete project
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the project, its chat associations, and any shared
            project memory. Your chats and their messages remain available in
            Chat history.
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
            <input name="projectId" type="hidden" value={projectId} />
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "Deleting…" : "Delete project"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
