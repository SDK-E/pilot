"use client";

import { useEffect, useState } from "react";

export interface SelectableCommand {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
}

/**
 * The composer's `/` command palette options, fetched once per mount.
 */
export function useSelectableCommands() {
  const [commands, setCommands] = useState<SelectableCommand[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/commands/selectable", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          commands: SelectableCommand[];
        };
        setCommands(data.commands);
      } catch {
        // Keep the composer usable with no command palette rather than
        // surfacing an error for what is an optional enhancement.
      }
    }
    void load();
    return () => {
      controller.abort();
    };
  }, []);

  return commands;
}
