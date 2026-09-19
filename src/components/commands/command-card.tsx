import { RiTerminalBoxLine } from "@remixicon/react";
import Link from "next/link";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import type { Command } from "@/commands/command-repository";

export function CommandCard({ command }: { command: Command }) {
  return (
    <Item asChild className="h-full items-start" variant="outline">
      <Link href={`/commands/${command.id}`}>
        <ItemMedia>
          <RiTerminalBoxLine aria-hidden="true" className="size-5" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>/{command.name}</ItemTitle>
          <ItemDescription className="line-clamp-2">
            {command.description || "No description yet."}
          </ItemDescription>
        </ItemContent>
      </Link>
    </Item>
  );
}
