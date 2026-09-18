import Link from "next/link";

import { MarketplaceBrowser } from "@/components/skills/marketplace-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/page-header";
import {
  isMarketplaceConfigured,
  listMarketplaceSkills,
} from "@/marketplace/skills-marketplace-client";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { listSkills } from "@/skills/skill-repository";

import type {
  MarketplaceResult,
  MarketplaceSkill,
} from "@/marketplace/skills-marketplace-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Skills marketplace" };

function MarketplaceBody({
  isConfigured,
  leaderboard,
  installedMarketplaceIds,
}: {
  isConfigured: boolean;
  leaderboard: MarketplaceResult<{ data: MarketplaceSkill[] }> | undefined;
  installedMarketplaceIds: string[];
}) {
  if (!isConfigured) {
    return (
      <Alert>
        <AlertTitle>Marketplace not connected yet</AlertTitle>
        <AlertDescription>
          Enable OIDC Federation for this project in the Vercel dashboard
          (Settings → OIDC Federation) so Pilot can call skills.sh&apos;s API.
          No key or signup is required beyond that toggle.
        </AlertDescription>
      </Alert>
    );
  }
  if (!leaderboard?.ok) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Marketplace unavailable</AlertTitle>
        <AlertDescription>{leaderboard?.error}</AlertDescription>
      </Alert>
    );
  }
  return (
    <MarketplaceBrowser
      initialSkills={leaderboard.data.data}
      installedMarketplaceIds={installedMarketplaceIds}
    />
  );
}

/**
 * Browses skills published to skills.sh's public directory and installs
 * one into this organization with a single click (see
 * `installMarketplaceSkillAction`). Requires Vercel OIDC Federation on this
 * project — see `isMarketplaceConfigured`.
 */
export default async function SkillsMarketplacePage() {
  const { organizationId, membership } = await requireWorkspaceSession();
  const isConfigured = isMarketplaceConfigured();
  const [leaderboard, organizationSkills] = await Promise.all([
    isConfigured
      ? listMarketplaceSkills({ view: "trending", perPage: 60 })
      : Promise.resolve(undefined),
    listSkills(organizationId),
  ]);
  const installedMarketplaceIds = organizationSkills
    .map((skill) => skill.marketplaceId)
    .filter((id): id is string => id !== null);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <PageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/skills">Back to skills</Link>
          </Button>
        }
        description="Browse published skills from the open skills.sh directory and add one to this organization."
        eyebrow={membership.organizationName}
        title="Skills marketplace"
      />
      <MarketplaceBody
        installedMarketplaceIds={installedMarketplaceIds}
        isConfigured={isConfigured}
        leaderboard={leaderboard}
      />
    </main>
  );
}
