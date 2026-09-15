import { withAuth } from "@workos-inc/authkit-nextjs";

import { CtaBand } from "@/components/marketing/cta-band";
import { FaqSection } from "@/components/marketing/faq-section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Hero } from "@/components/marketing/hero";
import { SocialProof } from "@/components/marketing/social-proof";
import { HOME_FAQ } from "@/marketing/faq";
import { SITE_URL } from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Pilot — one AI workspace for chat, work, and code" },
  description:
    "Pilot answers questions, plans and runs multi-step work, and reviews code in one workspace. Free to start, no credit card required.",
  alternates: { canonical: SITE_URL },
};

export default async function Home() {
  const { user } = await withAuth();
  const isSignedIn = Boolean(user);

  return (
    <>
      <Hero isSignedIn={isSignedIn} />
      <FeatureGrid />
      <SocialProof />
      <FaqSection items={HOME_FAQ} title="Frequently asked questions" />
      <CtaBand isSignedIn={isSignedIn} />
    </>
  );
}
