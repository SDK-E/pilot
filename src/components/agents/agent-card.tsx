import Link from "next/link";

import { isToolId } from "@/agents/agent-kinds";
import { TOOLS } from "@/agents/agent-tools";
import { AgentAvatar } from "@/components/agents/agent-avatar";

import type { Agent } from "@/agents/agent-repository";

export function AgentCard({ agent }: { agent: Agent }) {
  const tools = agent.enabledToolIds
    .filter(isToolId)
    .map((toolId) => TOOLS[toolId].name);
  return (
    <Link
      className="flex h-full items-start gap-3 rounded-2xl border border-border bg-card/50 p-4 transition-colors hover:bg-muted/50"
      href={`/agents/${agent.id}`}
    >
      <AgentAvatar className="mt-0.5 size-8" name={agent.name} />
      <span className="min-w-0">
        <span className="block font-medium">{agent.name}</span>
        <span className="mt-1 block line-clamp-2 text-sm text-muted-foreground">
          {agent.instructions}
        </span>
        <span className="mt-2 block text-xs text-muted-foreground">
          {tools.length > 0 ? tools.join(" · ") : "No tools"}
        </span>
      </span>
    </Link>
  );
}
