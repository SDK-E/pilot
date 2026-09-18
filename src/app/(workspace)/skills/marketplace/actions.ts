"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseSkillMarkdown } from "@/marketplace/skill-markdown";
import {
  getMarketplaceSkillDetail,
  listCuratedMarketplaceSkills,
  listMarketplaceSkills,
  searchMarketplaceSkills,
  type MarketplaceSkill,
} from "@/marketplace/skills-marketplace-client";
import {
  getWorkspaceSession,
  isWorkspaceSession,
} from "@/organizations/workspace-session";
import { upsertMarketplaceSkill } from "@/skills/skill-repository";

const installInputSchema = z.object({
  id: z.string().trim().min(1).max(300),
  name: z.string().trim().min(1).max(200),
  url: z.url(),
});

function isDuplicateName(cause: unknown) {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === "23505"
  );
}

function findSkillMarkdown(files: { path: string; contents: string }[] | null) {
  return files?.find((file) => file.path.toLowerCase() === "skill.md");
}

/**
 * Backs the marketplace page's search box — called directly from the
 * client browser component rather than loaded server-side, since the query
 * is user-typed and debounced.
 */
export async function searchMarketplaceSkillsAction(
  query: string,
): Promise<{ ok: boolean; skills: MarketplaceSkill[]; error?: string }> {
  const parsed = z.string().trim().min(2).max(200).safeParse(query);
  if (!parsed.success) return { ok: true, skills: [] };
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return { ok: false, skills: [] };
  const result = await searchMarketplaceSkills({ q: parsed.data, limit: 60 });
  if (!result.ok) return { ok: false, skills: [], error: result.error };
  return { ok: true, skills: result.data.data };
}

const marketplaceViewSchema = z.enum([
  "all-time",
  "trending",
  "hot",
  "official",
]);
export type MarketplaceView = z.infer<typeof marketplaceViewSchema>;

/**
 * Backs the marketplace page's view filter (All time / Trending / Hot /
 * Official) — called client-side, same as the search action above, so
 * switching views doesn't need a full page navigation.
 */
export async function listMarketplaceSkillsByViewAction(
  view: MarketplaceView,
): Promise<{ ok: boolean; skills: MarketplaceSkill[]; error?: string }> {
  const parsed = marketplaceViewSchema.safeParse(view);
  if (!parsed.success) return { ok: false, skills: [] };
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return { ok: false, skills: [] };
  const result =
    parsed.data === "official"
      ? await listCuratedMarketplaceSkills()
      : await listMarketplaceSkills({ view: parsed.data, perPage: 60 });
  if (!result.ok) return { ok: false, skills: [], error: result.error };
  return { ok: true, skills: result.data.data };
}

interface InstallContext {
  organizationId: string;
  userId: string;
  marketplaceId: string;
  marketplaceUrl: string;
  description: string;
  instructions: string;
}

/**
 * Installs once under `name`, retrying exactly once, qualified with
 * `sourceRepo`, if that name collides with a different, locally named skill
 * — the marketplaceId-keyed upsert target in `upsertMarketplaceSkill` didn't
 * match, so a thrown duplicate here is always the organization-name unique
 * constraint instead.
 */
async function installWithRetry(
  context: InstallContext,
  name: string,
  sourceRepo: string,
) {
  const install = (skillName: string) =>
    upsertMarketplaceSkill(context.organizationId, context.userId, {
      name: skillName,
      description: context.description,
      instructions: context.instructions,
      marketplaceId: context.marketplaceId,
      marketplaceUrl: context.marketplaceUrl,
    });

  try {
    return { installed: await install(name) };
  } catch (error_) {
    if (!isDuplicateName(error_)) throw error_;
    try {
      return { installed: await install(`${name} (${sourceRepo})`) };
    } catch {
      return {
        installed: undefined,
        error:
          "A skill with that name already exists. Rename it first, then try again.",
      };
    }
  }
}

/**
 * Installs a skill from the marketplace (skills.sh) into this organization:
 * fetches its SKILL.md, and creates or updates (see `upsertMarketplaceSkill`)
 * the org's own skill row from it. The listing/search result already
 * carries `name` and `url` — only the file contents need a second fetch.
 */
export async function installMarketplaceSkillAction(input: {
  id: string;
  name: string;
  url: string;
}): Promise<{ ok: boolean; error?: string; skillId?: string }> {
  const parsed = installInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid skill." };
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return { ok: false, error: "Signed out." };

  const detail = await getMarketplaceSkillDetail(parsed.data.id);
  if (!detail.ok) return { ok: false, error: detail.error };
  const skillMarkdown = findSkillMarkdown(detail.data.files);
  if (!skillMarkdown) {
    return { ok: false, error: "This skill has no SKILL.md to install." };
  }
  const { name, description, body } = parseSkillMarkdown(
    skillMarkdown.contents,
  );

  const { installed, error: installError } = await installWithRetry(
    {
      organizationId: session.organizationId,
      userId: session.user.id,
      marketplaceId: parsed.data.id,
      marketplaceUrl: parsed.data.url,
      description: description ?? "",
      instructions: body,
    },
    name ?? parsed.data.name,
    detail.data.source,
  );
  if (!installed) {
    return {
      ok: false,
      error: installError ?? "This skill could not be saved.",
    };
  }
  revalidatePath("/skills");
  return { ok: true, skillId: installed.id };
}
