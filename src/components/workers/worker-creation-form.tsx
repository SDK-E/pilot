"use client";

import { useActionState } from "react";
import { createWorkerAction } from "@/app/workspace/worker-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkerCreationState } from "@/workers/worker-creation-state";

const initialAgentCreationState: WorkerCreationState = { status: "idle" };

export function AgentCreationForm() {
  const [state, action, pending] = useActionState(
    createWorkerAction,
    initialAgentCreationState,
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="agent-name">Agent name</Label>
        <Input
          id="agent-name"
          name="name"
          maxLength={100}
          placeholder="Research agent"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-model">Model ID</Label>
        <Input
          id="agent-model"
          name="modelId"
          defaultValue="kilo/kilo-auto/free"
          maxLength={200}
          readOnly
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-instructions">Instructions</Label>
        <Textarea
          id="agent-instructions"
          name="instructions"
          maxLength={10_000}
          placeholder="Describe the agent's purpose, constraints, and expected outcomes."
          required
          rows={6}
        />
      </div>
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-primary"
          }
        >
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating agent…" : "Create agent"}
      </Button>
    </form>
  );
}
