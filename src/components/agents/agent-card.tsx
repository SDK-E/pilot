import Link from "next/link";

import { isToolId } from "@/agents/agent-kinds";
import { TOOLS } from "@/agents/agent-tools";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import type { Agent } from "@/agents/agent-repository";

export function AgentCard({ agent }: { agent: Agent }) {
  const tools = agent.enabledToolIds
    .filter(isToolId)
    .map((toolId) => TOOLS[toolId].name);
  return (
    <Item asChild className="h-full items-start" variant="outline">
      <Link href={`/agents/${agent.id}`}>
        <ItemMedia>
          <AgentAvatar name={agent.name} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{agent.name}</ItemTitle>
          <ItemDescription className="line-clamp-2">
            {agent.instructions}
          </ItemDescription>
          <p className="mt-1 text-xs text-muted-foreground">
            {tools.length > 0 ? tools.join(" · ") : "No tools"}
          </p>
        </ItemContent>
      </Link>
    </Item>
  );
}
