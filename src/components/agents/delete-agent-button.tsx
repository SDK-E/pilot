"use client";

import { RiDeleteBinLine } from "@remixicon/react";
import { useActionState } from "react";

import { deleteAgentAction } from "@/app/(workspace)/agents/actions";
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

import type { AgentFormState } from "@/agents/agent-form-state";

const initialState: AgentFormState = { status: "idle" };

export function DeleteAgentButton({
  agentId,
  name,
}: {
  agentId: string;
  name: string;
}) {
  const [state, action, pending] = useActionState(
    deleteAgentAction,
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
            The agent disappears from every mode. Its conversations stay
            readable in your history.
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
            <input name="agentId" type="hidden" value={agentId} />
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "Deleting…" : "Delete agent"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
