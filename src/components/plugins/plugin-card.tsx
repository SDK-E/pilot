import { RiPuzzle2Line } from "@remixicon/react";
import Link from "next/link";

import { isToolId } from "@/agents/agent-kinds";
import { TOOLS } from "@/agents/agent-tools";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import type { Plugin } from "@/plugins/plugin-repository";

export function PluginCard({ plugin }: { plugin: Plugin }) {
  const tools = plugin.toolIds
    .filter(isToolId)
    .map((toolId) => TOOLS[toolId].name);
  return (
    <Item asChild className="h-full items-start" variant="outline">
      <Link href={`/plugins/${plugin.id}`}>
        <ItemMedia>
          <RiPuzzle2Line aria-hidden="true" className="size-5" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{plugin.name}</ItemTitle>
          <ItemDescription className="line-clamp-2">
            {plugin.description || "No description yet."}
          </ItemDescription>
          <p className="mt-1 text-xs text-muted-foreground">
            {plugin.commandIds.length} command
            {plugin.commandIds.length === 1 ? "" : "s"} ·{" "}
            {tools.length > 0 ? tools.join(" · ") : "No tools"}
          </p>
        </ItemContent>
      </Link>
    </Item>
  );
}
