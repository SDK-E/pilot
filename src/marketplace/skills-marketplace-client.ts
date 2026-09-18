import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";

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

async function callSkillsApi<T>(
  path: string,
  revalidateSeconds: number,
): Promise<MarketplaceResult<T>> {
  // Called fresh inside the request, not hoisted to module scope — the
  // token is short-lived and request-scoped (see @vercel/oidc's own docs).
  const tokenResult = await fetchOidcToken();
  if (!tokenResult.ok) return tokenResult;
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${tokenResult.token}` },
      next: { revalidate: revalidateSeconds },
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
