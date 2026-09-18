import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";
import { unstable_cache } from "next/cache";

const BASE_URL = "https://skills.sh/api/v1";

export interface MarketplaceSkill {
  id: string;
  slug: string;
  name: string;
  source: string;
  installs: number;
  sourceType: "github" | "well-known";
  installUrl: string | null;
  url: string;
}

interface CuratedOwner {
  owner: string;
  totalInstalls: number;
  featuredRepo: string;
  featuredSkill: string;
  skills: MarketplaceSkill[];
}

export interface MarketplaceSkillDetail {
  id: string;
  source: string;
  slug: string;
  installs: number;
  hash: string | null;
  files: { path: string; contents: string }[] | null;
}

export type MarketplaceResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

const OIDC_SETUP_MESSAGE =
  "This project needs Secure Backend Access with OIDC Federation enabled (Vercel dashboard → Settings → Security) so Pilot can call skills.sh's API.";

/**
 * Fetches the OIDC token that authenticates every skills.sh call. A Vercel
 * *build* gets this as the `VERCEL_OIDC_TOKEN` env var, but a running
 * Vercel Function (this code path — a page request, not a build) instead
 * gets it via a request-scoped `x-vercel-oidc-token` header that
 * `getVercelOidcToken()` reads through `@vercel/oidc`'s own request
 * context — `process.env.VERCEL_OIDC_TOKEN` is never populated here, so
 * checking it (as this used to) always reported "not configured" even with
 * OIDC Federation correctly enabled. Missing that header — OIDC Federation
 * genuinely off — is the only expected failure mode; anything else here is
 * a real bug, not a setup gap, so it's left to throw and get logged instead
 * of being folded into the same message.
 */
async function fetchOidcToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  try {
    return { ok: true, token: await getVercelOidcToken() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("x-vercel-oidc-token")) throw error;
    return { ok: false, error: OIDC_SETUP_MESSAGE };
  }
}

async function fetchSkillsApi<T>(path: string): Promise<MarketplaceResult<T>> {
  // Called fresh inside the request, not hoisted to module scope — the
  // token is short-lived and request-scoped (see @vercel/oidc's own docs).
  const tokenResult = await fetchOidcToken();
  if (!tokenResult.ok) return tokenResult;
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${tokenResult.token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 429) {
        return {
          ok: false,
          error: "The skills marketplace is busy. Try again shortly.",
        };
      }
      return {
        ok: false,
        error: "The skills marketplace is unavailable right now.",
      };
    }
    const payload = (await response.json()) as T;
    return { ok: true, data: payload };
  } catch {
    return {
      ok: false,
      error: "The skills marketplace is unavailable right now.",
    };
  }
}

/**
 * Shared across every request and every organization — the skills.sh
 * catalog is the same for everyone, so there is no per-user or per-org
 * scoping to key on. Wrapping with `unstable_cache` (keyed only on `path`,
 * matching skills.sh's own documented cache windows: 30-60s for the
 * leaderboard/search, 5min for detail/curated) rather than relying on
 * `fetch`'s own Next.js cache means a cache hit skips minting a fresh OIDC
 * token at all, not just the network call — `fetchSkillsApi`'s
 * `cache: "no-store"` is deliberate: letting `fetch` additionally cache on
 * the Authorization header (which changes as the OIDC token rotates) would
 * just fragment this cache for no benefit. Two separate wrappers, not one
 * parameterized by revalidate time, since `unstable_cache`'s options are
 * fixed at wrap time, not per call.
 */
const cachedFetchShort = unstable_cache(
  (path: string) => fetchSkillsApi<unknown>(path),
  ["skills-marketplace-api-short"],
  { revalidate: 30, tags: ["skills-marketplace"] },
);
const cachedFetchLong = unstable_cache(
  (path: string) => fetchSkillsApi<unknown>(path),
  ["skills-marketplace-api-long"],
  { revalidate: 300, tags: ["skills-marketplace"] },
);

async function callSkillsApi<T>(
  path: string,
  revalidateSeconds: number,
): Promise<MarketplaceResult<T>> {
  const cached = revalidateSeconds <= 60 ? cachedFetchShort : cachedFetchLong;
  return (await cached(path)) as MarketplaceResult<T>;
}

/**
 * The all-time/trending/hot leaderboard. Matches skills.sh's own 30-60s
 * cache window for this endpoint.
 */
export async function listMarketplaceSkills(params: {
  view?: "all-time" | "trending" | "hot";
  page?: number;
  perPage?: number;
}): Promise<MarketplaceResult<{ data: MarketplaceSkill[] }>> {
  const query = new URLSearchParams();
  if (params.view) query.set("view", params.view);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.perPage !== undefined)
    query.set("per_page", String(params.perPage));
  return callSkillsApi(`/skills?${query.toString()}`, 30);
}

export async function searchMarketplaceSkills(params: {
  q: string;
  owner?: string;
  limit?: number;
}): Promise<MarketplaceResult<{ data: MarketplaceSkill[] }>> {
  const query = new URLSearchParams({ q: params.q });
  if (params.owner) query.set("owner", params.owner);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  return callSkillsApi(`/skills/search?${query.toString()}`, 30);
}

/**
 * The official curated set: skills published by the companies/orgs that
 * build the technology the skill is about (skills.sh's `/official`).
 * Flattened across every curated owner into one list, matching the shape
 * every other view already renders in — the page doesn't group by owner.
 */
export async function listCuratedMarketplaceSkills(): Promise<
  MarketplaceResult<{ data: MarketplaceSkill[] }>
> {
  const result = await callSkillsApi<{ data: CuratedOwner[] }>(
    "/skills/curated",
    300,
  );
  if (!result.ok) return result;
  return {
    ok: true,
    data: { data: result.data.data.flatMap((owner) => owner.skills) },
  };
}

/**
 * A single skill's install count and file tree (SKILL.md plus any
 * supporting files) — `id` is the stable "{source}/{slug}" value every
 * listing/search result already carries.
 */
export async function getMarketplaceSkillDetail(
  id: string,
): Promise<MarketplaceResult<MarketplaceSkillDetail>> {
  return callSkillsApi(`/skills/${id}`, 300);
}
