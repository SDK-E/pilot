"use client";

import { useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import type { SelectableCommand } from "@/components/conversations/use-selectable-commands";

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  commands: SelectableCommand[];
  /**
   * Expands the chosen command's `promptTemplate` into the composer draft.
   * `{placeholder}` tokens are inserted as-is for the user to fill in.
   */
  onSelect: (command: SelectableCommand) => void;
}

/**
 * The composer's `/` command palette: a named, reusable prompt template a
 * member picks instead of retyping it. Triggered by typing `/` at the start
 * of an empty draft — see `message-composer.tsx`.
 */
export function CommandPalette({
  isOpen,
  onOpenChange,
  commands,
  onSelect,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");

  return (
    <CommandDialog
      description="Search for a saved prompt to insert."
      onOpenChange={onOpenChange}
      open={isOpen}
      title="Commands"
    >
      <CommandInput
        onValueChange={setSearch}
        placeholder="Search commands…"
        value={search}
      />
      <CommandList>
        <CommandEmpty>No commands yet.</CommandEmpty>
        <CommandGroup heading="Commands">
          {commands.map((command) => (
            <CommandItem
              key={command.id}
              onSelect={() => {
                onSelect(command);
                setSearch("");
              }}
              value={command.name}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{command.name}</span>
                {command.description ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {command.description}
                  </span>
                ) : null}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
