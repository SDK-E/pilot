import Link from "next/link";

import { MarketplaceBrowser } from "@/components/skills/marketplace-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/page-header";
import { listMarketplaceSkills } from "@/marketplace/skills-marketplace-client";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { listSkills } from "@/skills/skill-repository";

import type {
  MarketplaceResult,
  MarketplaceSkill,
} from "@/marketplace/skills-marketplace-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Skills marketplace" };

function MarketplaceBody({
  leaderboard,
  installedMarketplaceIds,
}: {
  leaderboard: MarketplaceResult<{ data: MarketplaceSkill[] }>;
  installedMarketplaceIds: string[];
}) {
  if (!leaderboard.ok) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Marketplace unavailable</AlertTitle>
        <AlertDescription>{leaderboard.error}</AlertDescription>
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
 * `installMarketplaceSkillAction`). Requires Secure Backend Access with
 * OIDC Federation enabled for this Vercel project — see
 * `skills-marketplace-client.ts`'s `fetchOidcToken`.
 */
export default async function SkillsMarketplacePage() {
  const { organizationId, membership } = await requireWorkspaceSession();
  const [leaderboard, organizationSkills] = await Promise.all([
    listMarketplaceSkills({ view: "trending", perPage: 60 }),
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
        leaderboard={leaderboard}
      />
    </main>
  );
}
