"use client";

import { RiSearchLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AGENT_KINDS, modeHref } from "@/agents/agent-kinds";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { SidebarMenuButton } from "@/components/ui/sidebar";
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      setIsOpen((value) => !value);
    };
    addEventListener("keydown", onKeyDown);
    return () => {
      removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const go = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <>
      <SidebarMenuButton
        onClick={() => {
          setIsOpen(true);
        }}
        tooltip="Search"
      >
        <RiSearchLine aria-hidden="true" />
        <span>Search</span>
        <Kbd className="ml-auto">⌘K</Kbd>
      </SidebarMenuButton>
      <CommandDialog
        description="Search your conversations."
        onOpenChange={setIsOpen}
        open={isOpen}
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
                    go(modeHref(kind.id));
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
                    go(modeHref(conversation.kind, conversation.id));
                  }}
                  value={`${conversation.title ?? ""} ${conversation.agentName} ${conversation.preview ?? ""}`}
                >
                  <ModeIcon kind={conversation.kind} />
                  <span className="grid min-w-0 leading-tight">
                    <span className="truncate">
                      {conversation.title ?? "New conversation"}
                    </span>
                    <span className="truncate text-muted-foreground">
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
