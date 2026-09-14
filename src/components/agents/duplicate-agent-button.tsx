"use client";

import { RiFileCopyLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { duplicateAgentAction } from "@/app/(workspace)/agents/actions";
import { Button } from "@/components/ui/button";

import type { AgentFormState } from "@/agents/agent-form-state";

const initialState: AgentFormState = { status: "idle" };

export function DuplicateAgentButton({
  agentId,
  name,
}: {
  agentId: string;
  name: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    duplicateAgentAction,
    initialState,
  );
  useEffect(() => {
    if (state.href) router.push(state.href);
  }, [router, state.href]);

  return (
    <form action={action}>
      <input name="agentId" type="hidden" value={agentId} />
      <Button
        aria-label={`Duplicate ${name}`}
        disabled={pending}
        size="icon"
        title="Duplicate agent"
        type="submit"
        variant="ghost"
      >
        <RiFileCopyLine />
      </Button>
      <span aria-live="polite" className="sr-only">
        {state.message}
      </span>
    </form>
  );
}
