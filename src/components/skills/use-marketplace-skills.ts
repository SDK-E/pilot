"use client";

import { useEffect, useRef, useState, useTransition } from "react";

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
 *
 * Results are cached in-memory per view and per search query for the life
 * of this component — the server side already caches the skills.sh call
 * itself (see `skills-marketplace-client.ts`'s `unstable_cache` wrapping),
 * but that still costs a request/response round trip; this avoids even
 * that when flipping back to a view or a query already seen this visit.
 */
export function useMarketplaceSkills(initialSkills: MarketplaceSkill[]) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<MarketplaceView>("trending");
  const [viewSkills, setViewSkills] = useState(initialSkills);
  const [searchResults, setSearchResults] = useState<MarketplaceSkill[]>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const viewCache = useRef(new Map<MarketplaceView, MarketplaceSkill[]>());
  const searchCache = useRef(new Map<string, MarketplaceSkill[]>());

  const trimmedQuery = query.trim();
  const isQueryActive = trimmedQuery.length >= 2;

  useEffect(() => {
    if (view === "trending") return;
    const cached = viewCache.current.get(view);
    if (cached) {
      setViewSkills(cached);
      setError(undefined);
      return;
    }
    startTransition(async () => {
      const result = await listMarketplaceSkillsByViewAction(view);
      if (result.ok) viewCache.current.set(view, result.skills);
      setViewSkills(result.skills);
      setError(result.ok ? undefined : result.error);
    });
  }, [view]);

  const resolvedViewSkills = view === "trending" ? initialSkills : viewSkills;

  useEffect(() => {
    if (!isQueryActive) return;
    const cached = searchCache.current.get(trimmedQuery);
    if (cached) {
      setSearchResults(cached);
      setError(undefined);
      return;
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const result = await searchMarketplaceSkillsAction(trimmedQuery);
        if (result.ok) searchCache.current.set(trimmedQuery, result.skills);
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
