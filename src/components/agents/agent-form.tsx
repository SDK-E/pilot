"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  AGENT_KIND_IDS,
  AGENT_KINDS,
  TOOL_IDS,
  type AgentKindId,
} from "@/agents/agent-kinds";
import { isToolAvailableTo, TOOLS } from "@/agents/agent-tools";
import {
  createAgentAction,
  updateAgentAction,
} from "@/app/(workspace)/agents/actions";
import { PersonaFields } from "@/components/agents/persona-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ModeIcon } from "@/components/workspace/mode-icon";

import type { AgentFormState } from "@/agents/agent-form-state";
import type { Agent } from "@/agents/agent-repository";

const initialState: AgentFormState = { status: "idle" };

const APPROVAL_OPTIONS = [
  { value: "ask", label: "Ask me first" },
  { value: "allow", label: "Allow automatically" },
  { value: "deny", label: "Never" },
] as const;

function KindPicker({
  value,
  onChange,
  disabled,
}: {
  value: AgentKindId;
  onChange: (kind: AgentKindId) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-3">
      <legend className="mb-2 text-sm font-medium">Mode</legend>
      {/*
        A disabled input is never included in FormData, so once an existing
        agent's mode is locked (disabled=true below), the radios alone would
        submit no baseAgentId at all and updateAgentAction would fail its own
        validation on every save. This hidden input carries the value in
        that case; it's harmless alongside the (enabled) radios when
        creating a new agent, since both stay in sync with the same value.
      */}
      {disabled ? (
        <input name="baseAgentId" type="hidden" value={value} />
      ) : null}
      {AGENT_KIND_IDS.map((kind) => (
        <label
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:cursor-default"
          key={kind}
        >
          <input
            checked={value === kind}
            className="sr-only"
            disabled={disabled}
            name="baseAgentId"
            onChange={() => {
              onChange(kind);
            }}
            type="radio"
            value={kind}
          />
          <ModeIcon className="mt-0.5 size-4 text-primary" kind={kind} />
          <span>
            <span className="block font-medium">{AGENT_KINDS[kind].name}</span>
            <span className="block text-xs text-muted-foreground">
              {AGENT_KINDS[kind].tagline}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function ToolRules({ kind, agent }: { kind: AgentKindId; agent?: Agent }) {
  return (
    <div className="space-y-3">
      <Label>Tools</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {TOOL_IDS.filter((toolId) => isToolAvailableTo(toolId, kind)).map(
          (toolId) => {
            const tool = TOOLS[toolId];
            const isEnabled = agent
              ? agent.enabledToolIds.includes(toolId)
              : true;
            return (
              <div
                className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm"
                key={toolId}
              >
                <input
                  className="mt-0.5 size-4 accent-primary"
                  defaultChecked={isEnabled}
                  name="enabledToolIds"
                  type="checkbox"
                  value={toolId}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{tool.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {tool.description}
                  </span>
                  {tool.approvable ? (
                    <select
                      aria-label={`${tool.name} approval`}
                      className="mt-2 h-8 rounded-md border border-input bg-background px-2 text-xs"
                      defaultValue={agent?.approvalRules[toolId] ?? "ask"}
                      name={`approvalRule.${toolId}`}
                    >
                      {APPROVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </span>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

/**
 * Create or edit one agent. The mode is fixed once an agent exists because
 * its conversations live under that mode.
 */
export function AgentForm({
  agent,
  defaultKind,
}: {
  agent?: Agent;
  defaultKind: AgentKindId;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<AgentKindId>(defaultKind);
  const [state, action, pending] = useActionState(
    agent ? updateAgentAction : createAgentAction,
    initialState,
  );
  const submitLabel = agent ? "Save agent" : "Create agent";
  useEffect(() => {
    if (state.status === "success" && state.href) router.push(state.href);
  }, [router, state.href, state.status]);

  return (
    <form action={action} className="space-y-6">
      {agent ? <input name="agentId" type="hidden" value={agent.id} /> : null}
      <KindPicker disabled={Boolean(agent)} onChange={setKind} value={kind} />
      <PersonaFields agent={agent} kind={kind} />
      <ToolRules agent={agent} kind={kind} />
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
      <Button disabled={pending} type="submit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
