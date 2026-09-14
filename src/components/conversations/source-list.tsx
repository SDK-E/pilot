"use client";

import { RiArrowRightSLine, RiLinkM } from "@remixicon/react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";

interface Source {
  title: string;
  domain: string;
  url: string;
}

export function SourceList({ sources }: { sources: Source[] }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible className="mt-3" onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <RiArrowRightSLine
          aria-hidden="true"
          className="transition-transform data-[state=open]:rotate-90"
          data-state={isOpen ? "open" : "closed"}
        />
        Sources ({sources.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1">
        {sources.map((source) => (
          <Item asChild key={source.url} size="sm" variant="muted">
            <a href={source.url} rel="noreferrer" target="_blank">
              <ItemMedia variant="icon">
                <RiLinkM aria-hidden="true" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="truncate">{source.title}</ItemTitle>
              </ItemContent>
              <span className="shrink-0 text-muted-foreground">
                {source.domain}
              </span>
            </a>
          </Item>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
