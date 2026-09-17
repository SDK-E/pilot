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
      <input name="baseAgentId" type="hidden" value={value} />
      {AGENT_KIND_IDS.map((kind) => (
        <label
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:cursor-default"
          key={kind}
        >
          <input
            checked={value === kind}
            className="sr-only"
            disabled={disabled}
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

function SkillRules({
  skills,
  agent,
}: {
  skills: { id: string; name: string; description: string }[];
  agent?: Agent;
}) {
  if (skills.length === 0) return null;
  return (
    <div className="space-y-3">
      <Label>Skills</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {skills.map((skill) => {
          const isEnabled = agent
            ? agent.enabledSkillIds.includes(skill.id)
            : false;
          return (
            <div
              className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm"
              key={skill.id}
            >
              <input
                className="mt-0.5 size-4 accent-primary"
                defaultChecked={isEnabled}
                name="enabledSkillIds"
                type="checkbox"
                value={skill.id}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{skill.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {skill.description || "No description yet."}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
  skills = [],
}: {
  agent?: Agent;
  defaultKind: AgentKindId;
  skills?: { id: string; name: string; description: string }[];
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
      <SkillRules agent={agent} skills={skills} />
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
