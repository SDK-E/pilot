"use client";

import { useActionState, useEffect } from "react";

import {
  decideApprovalAction,
  type ActionState,
} from "@/app/(workspace)/[mode]/[conversationId]/actions";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";

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
    <section className="space-y-2">
      <div>
        <h2 className="text-xs font-medium">Needs your approval</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pilot pauses here before an action that needs your decision.
        </p>
      </div>
      {approvals.length > 0 ? (
        <ItemGroup>
          {approvals.map((approval) => (
            <Item key={approval.id} size="sm" variant="outline">
              <ItemContent>
                <ItemTitle>{approval.summary}</ItemTitle>
                <ItemDescription className="capitalize">
                  {approval.status}
                </ItemDescription>
              </ItemContent>
              {approval.status === "pending" ? (
                <ItemFooter>
                  <form action={action} className="flex gap-2">
                    <input name="mode" type="hidden" value={kind} />
                    <input
                      name="conversationId"
                      type="hidden"
                      value={conversationId}
                    />
                    <input
                      name="approvalId"
                      type="hidden"
                      value={approval.id}
                    />
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
                </ItemFooter>
              ) : null}
            </Item>
          ))}
        </ItemGroup>
      ) : (
        <p className="text-xs text-muted-foreground">
          Approval cards appear only when an action needs your decision.
        </p>
      )}
      {state.status === "error" ? (
        <p aria-live="polite" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
