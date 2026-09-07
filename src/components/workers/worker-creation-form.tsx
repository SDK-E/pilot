"use client";

import { useActionState } from "react";
import { baseAgents, configurableToolIds } from "@/agents/agent-configuration";
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
        <Label htmlFor="agent-base">Base agent</Label>
        <select
          id="agent-base"
          name="baseAgentId"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          defaultValue="conversational"
        >
          {baseAgents.map((agent) => (
            <option key={agent.id} value={agent.id} disabled={!agent.available}>
              {agent.name}
              {agent.available ? "" : " — coming soon"}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Research remains unavailable until its production tool boundary is
          verified.
        </p>
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
      <div className="space-y-2">
        <Label htmlFor="agent-goals">Goals</Label>
        <Textarea
          id="agent-goals"
          name="goals"
          maxLength={5_000}
          placeholder="Optional outcomes this persona should optimize for."
          rows={3}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agent-tone">Tone</Label>
          <Input
            id="agent-tone"
            name="tone"
            maxLength={200}
            placeholder="Clear and pragmatic"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-approval">Tool approvals</Label>
          <select
            id="agent-approval"
            name="approvalMode"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            defaultValue="ask"
          >
            <option value="ask">Ask before each tool</option>
            <option value="allow">Allow automatically</option>
            <option value="deny">Deny all tools</option>
            <option value="auto-classifier">Auto-classifier</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        <Label>Enabled tools</Label>
        <p className="text-xs text-muted-foreground">
          These are persona preferences only. No tool is available until its
          server-side capability boundary is implemented and authorized.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {configurableToolIds.map((toolId) => (
            <label
              key={toolId}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <input
                name="enabledToolIds"
                type="checkbox"
                value={toolId}
                className="size-4 accent-primary"
              />
              {toolId.replaceAll("-", " ")}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-output-format">Output format</Label>
        <Textarea
          id="agent-output-format"
          name="outputFormat"
          maxLength={1_000}
          placeholder="Optional format, such as concise markdown with sources."
          rows={3}
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
