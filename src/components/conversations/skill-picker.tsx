"use client";

import { RiSparklingLine } from "@remixicon/react";

import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ComposerSkill {
  id: string;
  name: string;
}

interface SkillPickerProps {
  skills: ComposerSkill[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

/**
 * Selects which of the agent's skills are active for this message —
 * mirrors Claude.ai's skills picker in its composer's "+" menu. Each
 * active skill contributes extra instructions and any tools it grants
 * once the message is sent (see `resolveSkillsInstructions`,
 * `resolveSkillsToolIds`).
 */
export function SkillPicker({
  skills,
  selected,
  onChange,
  disabled,
}: SkillPickerProps) {
  if (skills.length === 0) return null;

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
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Skills for this message</DropdownMenuLabel>
        {skills.map((skill) => (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
