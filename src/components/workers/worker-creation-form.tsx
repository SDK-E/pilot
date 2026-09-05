"use client";

import { useActionState } from "react";
import {
  createWorkerAction,
  initialWorkerCreationState,
} from "@/app/workspace/worker-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function WorkerCreationForm() {
  const [state, action, pending] = useActionState(
    createWorkerAction,
    initialWorkerCreationState,
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="worker-name">Worker name</Label>
        <Input
          id="worker-name"
          name="name"
          maxLength={100}
          placeholder="Research assistant"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="worker-model">Model ID</Label>
        <Input
          id="worker-model"
          name="modelId"
          maxLength={200}
          placeholder="provider/model-name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="worker-instructions">Instructions</Label>
        <Textarea
          id="worker-instructions"
          name="instructions"
          maxLength={10_000}
          placeholder="Describe the worker's purpose, constraints, and expected outcomes."
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
        {pending ? "Creating worker…" : "Create worker"}
      </Button>
    </form>
  );
}
