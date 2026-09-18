"use client";

import { useEffect, useState, useTransition } from "react";

import {
  listMarketplaceSkillsByViewAction,
  searchMarketplaceSkillsAction,
  type MarketplaceView,
} from "@/app/(workspace)/skills/marketplace/actions";

import type { MarketplaceSkill } from "@/marketplace/skills-marketplace-client";

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Drives the marketplace page's two filters: a search box and a view
 * (All time / Trending / Hot / Official). Search takes over the list
 * whenever it has 2+ characters, independent of whatever view is selected;
 * clearing it falls back to the current view's own results, refetched only
 * on an actual view change, not on every render.
 */
export function useMarketplaceSkills(initialSkills: MarketplaceSkill[]) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<MarketplaceView>("trending");
  const [viewSkills, setViewSkills] = useState(initialSkills);
  const [searchResults, setSearchResults] = useState<MarketplaceSkill[]>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const trimmedQuery = query.trim();
  const isQueryActive = trimmedQuery.length >= 2;

  useEffect(() => {
    if (view === "trending") return;
    startTransition(async () => {
      const result = await listMarketplaceSkillsByViewAction(view);
      setViewSkills(result.skills);
      setError(result.ok ? undefined : result.error);
    });
  }, [view]);

  const resolvedViewSkills = view === "trending" ? initialSkills : viewSkills;

  useEffect(() => {
    if (!isQueryActive) return;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const result = await searchMarketplaceSkillsAction(trimmedQuery);
        setSearchResults(result.skills);
        setError(result.ok ? undefined : result.error);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeout);
    };
  }, [isQueryActive, trimmedQuery]);

  return {
    query,
    setQuery,
    view,
    setView,
    skills: isQueryActive
      ? (searchResults ?? resolvedViewSkills)
      : resolvedViewSkills,
    isQueryActive,
    isPending,
    error: isQueryActive || view !== "trending" ? error : undefined,
  };
}
