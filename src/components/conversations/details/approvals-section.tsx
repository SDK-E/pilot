"use client";

import { useActionState, useEffect } from "react";

import {
  decideApprovalAction,
  type ActionState,
} from "@/app/(workspace)/[mode]/[conversationId]/actions";
import { Button } from "@/components/ui/button";

import type { AgentKindId } from "@/agents/agent-kinds";

const initialState: ActionState = { status: "idle" };

/**
 * Approvals Pilot paused on before using a tool. Pending ones can be decided
 * here; the decision resumes the suspended run on the server.
 */
export function ApprovalsSection({
  kind,
  conversationId,
  approvals,
  onDecided,
}: {
  kind: AgentKindId;
  conversationId: string;
  approvals: { id: string; summary: string; status: string }[];
  onDecided: () => void;
}) {
  const [state, action, isPending] = useActionState(
    decideApprovalAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") onDecided();
  }, [state.status, onDecided]);

  return (
    <section>
      <h2 className="text-sm font-medium">Needs your approval</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Pilot pauses here before an action that needs your decision.
      </p>
      {approvals.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {approvals.map((approval) => (
            <li
              className="rounded-xl border border-border bg-card/60 px-3 py-2"
              key={approval.id}
            >
              <p className="text-sm font-medium">{approval.summary}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {approval.status}
              </p>
              {approval.status === "pending" ? (
                <form action={action} className="mt-3 flex gap-2">
                  <input name="mode" type="hidden" value={kind} />
                  <input
                    name="conversationId"
                    type="hidden"
                    value={conversationId}
                  />
                  <input name="approvalId" type="hidden" value={approval.id} />
                  <Button
                    disabled={isPending}
                    name="decision"
                    size="sm"
                    type="submit"
                    value="approve"
                  >
                    Approve
                  </Button>
                  <Button
                    disabled={isPending}
                    name="decision"
                    size="sm"
                    type="submit"
                    value="reject"
                    variant="outline"
                  >
                    Decline
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Approval cards appear only when an action needs your decision.
        </p>
      )}
      {state.status === "error" ? (
        <p aria-live="polite" className="mt-2 text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
