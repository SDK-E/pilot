"use client";

import { RiAddLine, RiSparklingLine } from "@remixicon/react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { setAgentSkillEnabledAction } from "@/app/(workspace)/agents/actions";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ComposerSkill {
  id: string;
  name: string;
  /**
   * Whether the current agent has this organization skill granted yet.
   */
  granted: boolean;
}

interface SkillPickerProps {
  agentId: string;
  skills: ComposerSkill[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

function GrantSkillItem({
  agentId,
  skillId,
  name,
  onGranted,
}: {
  agentId: string;
  skillId: string;
  name: string;
  onGranted: (skillId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <DropdownMenuItem
      disabled={isPending}
      onSelect={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await setAgentSkillEnabledAction(
            agentId,
            skillId,
            true,
          );
          if (result.ok) onGranted(skillId);
        });
      }}
    >
      <RiAddLine aria-hidden="true" className="size-4 text-muted-foreground" />
      <span className="flex-1 truncate">{name}</span>
      <span className="text-xs text-muted-foreground">
        {isPending ? "Adding…" : "Add"}
      </span>
    </DropdownMenuItem>
  );
}

/**
 * Selects which of the agent's granted skills are active for this message —
 * mirrors Claude.ai's skills picker in its composer's "+" menu. Each active
 * skill contributes extra instructions and any tools it grants once the
 * message is sent (see `resolveSkillsInstructions`, `resolveSkillsToolIds`).
 *
 * Always renders, even with zero granted skills — an agent with
 * organization skills it just hasn't been granted yet, or an organization
 * with no skills at all, previously made this picker disappear entirely
 * (`skills.length === 0`), which was indistinguishable from the feature not
 * existing. Ungranted organization skills are offered here directly as a
 * one-click "Add", instead of sending the user to the agent's edit form.
 */
export function SkillPicker({
  agentId,
  skills,
  selected,
  onChange,
  disabled,
}: SkillPickerProps) {
  const [locallyGranted, setLocallyGranted] = useState<Set<string>>(
    () => new Set(),
  );
  const isGranted = (skill: ComposerSkill) =>
    skill.granted || locallyGranted.has(skill.id);
  const grantedSkills = skills.filter((skill) => isGranted(skill));
  const ungrantedSkills = skills.filter((skill) => !isGranted(skill));

  const toggle = (skillId: string, shouldBeOn: boolean) => {
    onChange(
      shouldBeOn
        ? [...selected, skillId]
        : selected.filter((id) => id !== skillId),
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton disabled={disabled} tooltip="Skills">
          <RiSparklingLine className="size-4" />
          {selected.length > 0 ? (
            <Badge className="h-4 min-w-4 px-1 text-[10px]" variant="outline">
              {selected.length}
            </Badge>
          ) : null}
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {grantedSkills.length > 0 ? (
          <>
            <DropdownMenuLabel>Skills for this message</DropdownMenuLabel>
            {grantedSkills.map((skill) => (
              <DropdownMenuCheckboxItem
                checked={selected.includes(skill.id)}
                key={skill.id}
                onCheckedChange={(checked) => {
                  toggle(skill.id, checked);
                }}
                onSelect={(event) => {
                  event.preventDefault();
                }}
              >
                {skill.name}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        ) : (
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            {skills.length === 0
              ? "This organization has no skills yet."
              : "No skills are enabled for this agent yet."}
          </DropdownMenuLabel>
        )}
        {ungrantedSkills.length > 0 ? (
          <>
            {grantedSkills.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>Add a skill to this agent</DropdownMenuLabel>
            {ungrantedSkills.map((skill) => (
              <GrantSkillItem
                agentId={agentId}
                key={skill.id}
                name={skill.name}
                onGranted={(skillId) => {
                  setLocallyGranted((current) => new Set(current).add(skillId));
                }}
                skillId={skill.id}
              />
            ))}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <div className="p-1">
          <Button
            asChild
            className="w-full justify-start"
            size="sm"
            variant="ghost"
          >
            <Link href="/skills/new">
              <RiAddLine aria-hidden="true" className="size-4" />
              Create a new skill
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
