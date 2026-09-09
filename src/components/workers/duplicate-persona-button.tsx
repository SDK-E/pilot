"use client";

import { useActionState, useEffect } from "react";
import { CopyPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  duplicatePersonaAction,
  type DuplicatePersonaState,
} from "@/app/workspace/personas/actions";
import { Button } from "@/components/ui/button";

const initialState: DuplicatePersonaState = { status: "idle" };

export function DuplicatePersonaButton({
  workerId,
  name,
}: {
  workerId: string;
  name: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    duplicatePersonaAction,
    initialState,
  );

  useEffect(() => {
    if (state.href) router.push(state.href);
  }, [router, state.href]);

  return (
    <form action={action}>
      <input type="hidden" name="workerId" value={workerId} />
      <Button
        aria-label={`Duplicate ${name}`}
        disabled={pending}
        size="icon"
        title="Duplicate persona"
        type="submit"
        variant="ghost"
      >
        <CopyPlus className="size-4" />
      </Button>
      <span aria-live="polite" className="sr-only">
        {state.message}
      </span>
    </form>
  );
}
