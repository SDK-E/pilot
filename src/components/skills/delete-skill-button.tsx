"use client";

import { RiDeleteBinLine } from "@remixicon/react";
import { useActionState } from "react";

import { deleteSkillAction } from "@/app/(workspace)/skills/actions";
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

import type { SkillFormState } from "@/skills/skill-form-state";

const initialState: SkillFormState = { status: "idle" };

export function DeleteSkillButton({
  skillId,
  name,
}: {
  skillId: string;
  name: string;
}) {
  const [state, action, pending] = useActionState(
    deleteSkillAction,
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
            No longer selectable in the composer or an agent&apos;s settings.
            Past messages that used it keep their record of it.
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
            <input name="skillId" type="hidden" value={skillId} />
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "Deleting…" : "Delete skill"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
