import { RiSparklingLine } from "@remixicon/react";
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

import type { Skill } from "@/skills/skill-repository";

export function SkillCard({ skill }: { skill: Skill }) {
  const tools = skill.toolIds
    .filter(isToolId)
    .map((toolId) => TOOLS[toolId].name);
  return (
    <Item asChild className="h-full items-start" variant="outline">
      <Link href={`/skills/${skill.id}`}>
        <ItemMedia>
          <RiSparklingLine aria-hidden="true" className="size-5" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{skill.name}</ItemTitle>
          <ItemDescription className="line-clamp-2">
            {skill.description || "No description yet."}
          </ItemDescription>
          <p className="mt-1 text-xs text-muted-foreground">
            {tools.length > 0 ? tools.join(" · ") : "No tools"}
            {skill.marketplaceId ? " · From the marketplace" : null}
          </p>
        </ItemContent>
      </Link>
    </Item>
  );
}
