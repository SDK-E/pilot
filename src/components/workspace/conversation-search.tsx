"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AGENT_KINDS, modeHref } from "@/agents/agent-kinds";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { ModeIcon } from "@/components/workspace/mode-icon";

import type { RecentConversation } from "@/components/workspace/workspace-shell";

/**
 * ⌘K palette over the user's recent conversations.
 */
export function ConversationSearch({
  conversations,
}: {
  conversations: RecentConversation[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      )) {
        return;
      }

      event.preventDefault();
      setOpen((value) => !value);
    };
    addEventListener("keydown", onKeyDown);
    return () => {
      removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const open_ = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        className="w-full justify-start"
        onClick={() => {
          setOpen(true);
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Search aria-hidden="true" />
        Search<CommandShortcut>⌘K</CommandShortcut>
      </Button>
      <CommandDialog
        description="Search your conversations."
        onOpenChange={setOpen}
        open={open}
        title="Search"
      >
        <Command>
          <CommandInput placeholder="Search conversations…" />
          <CommandList>
            <CommandEmpty>No matching conversations.</CommandEmpty>
            <CommandGroup heading="Start">
              {Object.values(AGENT_KINDS).map((kind) => (
                <CommandItem
                  key={kind.id}
                  onSelect={() => {
                    open_(modeHref(kind.id));
                  }}
                >
                  <ModeIcon kind={kind.id} />
                  New {kind.name.toLowerCase()} conversation
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Recent">
              {conversations.map((conversation) => (
                <CommandItem
                  key={conversation.id}
                  onSelect={() => {
                    open_(modeHref(conversation.kind, conversation.id));
                  }}
                  value={`${conversation.title ?? ""} ${conversation.agentName} ${conversation.preview ?? ""}`}
                >
                  <ModeIcon kind={conversation.kind} />
                  <span className="min-w-0">
                    <span className="block truncate">
                      {conversation.title ?? "New conversation"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {conversation.preview ?? conversation.agentName}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
