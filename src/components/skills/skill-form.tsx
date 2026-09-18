"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { TOOL_IDS } from "@/agents/agent-kinds";
import { TOOLS } from "@/agents/agent-tools";
import {
  createSkillAction,
  updateSkillAction,
} from "@/app/(workspace)/skills/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { SkillFormState } from "@/skills/skill-form-state";
import type { Skill } from "@/skills/skill-repository";

const initialState: SkillFormState = { status: "idle" };

/**
 * Create or edit one skill: a name, description, optional extra
 * instructions appended to an agent's own, and which existing tools it
 * grants when active — see `resolveSkillsInstructions`/
 * `resolveSkillsToolIds`.
 */
export function SkillForm({ skill }: { skill?: Skill }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    skill ? updateSkillAction : createSkillAction,
    initialState,
  );
  const submitLabel = skill ? "Save skill" : "Create skill";
  useEffect(() => {
    if (state.status === "success" && state.href) router.push(state.href);
  }, [router, state.href, state.status]);

  return (
    <form action={action} className="space-y-6">
      {skill ? <input name="skillId" type="hidden" value={skill.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="skill-name">Name</Label>
        <Input
          defaultValue={skill?.name}
          id="skill-name"
          maxLength={100}
          name="name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="skill-description">Description</Label>
        <Input
          defaultValue={skill?.description}
          id="skill-description"
          maxLength={300}
          name="description"
          placeholder="What this skill is for"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="skill-instructions">Instructions</Label>
        <Textarea
          className="min-h-32"
          defaultValue={skill?.instructions}
          id="skill-instructions"
          maxLength={8000}
          name="instructions"
          placeholder="Extra instructions appended to the agent's own when this skill is active"
        />
      </div>
      <div className="space-y-3">
        <Label>Tools this skill grants</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOOL_IDS.map((toolId) => {
            const tool = TOOLS[toolId];
            const isEnabled = skill ? skill.toolIds.includes(toolId) : false;
            return (
              <div
                className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm"
                key={toolId}
              >
                <input
                  className="mt-0.5 size-4 accent-primary"
                  defaultChecked={isEnabled}
                  name="toolIds"
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
          })}
        </div>
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
      <Button disabled={pending} type="submit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
