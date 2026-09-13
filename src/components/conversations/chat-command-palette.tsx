"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, MessageSquareMore, Plus } from "lucide-react";
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

type Chat = {
  id: string;
  workerId: string;
  title: string | null;
  agentName: string;
  latestMessagePreview: string | null;
  updatedLabel: string;
};

export function ChatCommandPalette({ chats }: { chats: Chat[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  return (
    <>
      <Button
        className="w-full justify-start"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <History aria-hidden="true" />
        Search chats<CommandShortcut>⌘K</CommandShortcut>
      </Button>
      <CommandDialog
        description="Search your private conversations."
        onOpenChange={setOpen}
        open={open}
        title="Search chats"
      >
        <Command>
          <CommandInput placeholder="Search chats…" />
          <CommandList>
            <CommandEmpty>No matching chats.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => go("/workspace")}>
                <Plus />
                New chat
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Your chats">
              {chats.map((chat) => (
                <CommandItem
                  key={chat.id}
                  onSelect={() =>
                    go(
                      `/workspace/workers/${chat.workerId}/conversations/${chat.id}`,
                    )
                  }
                  value={`${chat.title} ${chat.agentName} ${chat.latestMessagePreview}`}
                >
                  <MessageSquareMore />
                  <span className="min-w-0">
                    <span className="block truncate">
                      {chat.title ?? "New conversation"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {chat.latestMessagePreview || chat.agentName} ·{" "}
                      {chat.updatedLabel}
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
