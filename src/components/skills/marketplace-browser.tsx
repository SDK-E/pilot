"use client";

import { RiCheckLine, RiSearchLine, RiSparklingLine } from "@remixicon/react";
import { useEffect, useState, useTransition } from "react";

import {
  installMarketplaceSkillAction,
  searchMarketplaceSkillsAction,
} from "@/app/(workspace)/skills/marketplace/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import type { MarketplaceSkill } from "@/marketplace/skills-marketplace-client";

const SEARCH_DEBOUNCE_MS = 350;

function formatInstalls(installs: number) {
  if (installs >= 1_000_000) return `${(installs / 1_000_000).toFixed(1)}M`;
  if (installs >= 1000) return `${(installs / 1000).toFixed(1)}K`;
  return String(installs);
}

function InstallButton({
  skill,
  isInstalled,
  onInstalled,
}: {
  skill: MarketplaceSkill;
  isInstalled: boolean;
  onInstalled: (marketplaceId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  if (isInstalled) {
    return (
      <Button disabled size="sm" variant="outline">
        <RiCheckLine aria-hidden="true" />
        Added
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        disabled={isPending}
        onClick={() => {
          setError(undefined);
          startTransition(async () => {
            const result = await installMarketplaceSkillAction({
              id: skill.id,
              name: skill.name,
              url: skill.url,
            });
            if (result.ok) onInstalled(skill.id);
            else setError(result.error ?? "Could not add this skill.");
          });
        }}
        size="sm"
        variant="outline"
      >
        {isPending ? "Adding…" : "Add to Pilot"}
      </Button>
      {error ? (
        <p className="max-w-40 text-right text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

function MarketplaceSkillRow({
  skill,
  isInstalled,
  onInstalled,
}: {
  skill: MarketplaceSkill;
  isInstalled: boolean;
  onInstalled: (marketplaceId: string) => void;
}) {
  return (
    <Item className="items-start" variant="outline">
      <ItemMedia>
        <RiSparklingLine aria-hidden="true" className="size-5" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <a href={skill.url} rel="noreferrer" target="_blank">
            {skill.name}
          </a>
        </ItemTitle>
        <ItemDescription>{skill.source}</ItemDescription>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatInstalls(skill.installs)} installs
        </p>
      </ItemContent>
      <ItemActions>
        <InstallButton
          isInstalled={isInstalled}
          onInstalled={onInstalled}
          skill={skill}
        />
      </ItemActions>
    </Item>
  );
}

export function MarketplaceBrowser({
  initialSkills,
  installedMarketplaceIds,
}: {
  initialSkills: MarketplaceSkill[];
  installedMarketplaceIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MarketplaceSkill[]>();
  const [searchError, setSearchError] = useState<string>();
  const [isSearching, startSearch] = useTransition();
  const [installed, setInstalled] = useState(
    () => new Set(installedMarketplaceIds),
  );

  const trimmedQuery = query.trim();
  const isQueryActive = trimmedQuery.length >= 2;

  useEffect(() => {
    if (!isQueryActive) return;
    const timeout = setTimeout(() => {
      startSearch(async () => {
        const result = await searchMarketplaceSkillsAction(trimmedQuery);
        setSearchResults(result.skills);
        setSearchError(result.ok ? undefined : result.error);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeout);
    };
  }, [isQueryActive, trimmedQuery]);

  const skills = isQueryActive
    ? (searchResults ?? initialSkills)
    : initialSkills;
  const markInstalled = (marketplaceId: string) => {
    setInstalled((current) => new Set(current).add(marketplaceId));
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <RiSearchLine
          aria-hidden="true"
          className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search skills"
          className="pl-8"
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Search skills…"
          value={query}
        />
      </div>
      {isQueryActive && searchError ? (
        <p className="text-sm text-destructive">{searchError}</p>
      ) : null}
      {isQueryActive && isSearching ? (
        <p className="text-xs text-muted-foreground">Searching…</p>
      ) : null}
      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">No skills found.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {skills.map((skill) => (
            <li key={skill.id}>
              <MarketplaceSkillRow
                isInstalled={installed.has(skill.id)}
                onInstalled={markInstalled}
                skill={skill}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
