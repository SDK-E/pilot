import { CtaBand } from "@/components/marketing/cta-band";
import { FaqSection } from "@/components/marketing/faq-section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { ProblemStrip } from "@/components/marketing/problem-strip";
import { SocialProof } from "@/components/marketing/social-proof";
import { HOME_FAQ } from "@/marketing/faq";
import { marketingSession } from "@/marketing/marketing-auth";
import { SITE_URL } from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Pilot — ask fast, ship faster" },
  description:
    "Pilot answers your questions, plans and runs the work behind them, and turns code changes into diffs you can review. Free to start, no credit card.",
  alternates: { canonical: SITE_URL },
};

export default async function Home() {
  const { isSignedIn } = await marketingSession();

  return (
    <>
      <Hero isSignedIn={isSignedIn} />
      <ProblemStrip />
      <FeatureGrid />
      <HowItWorks />
      <SocialProof />
      <PricingTeaser />
      <FaqSection items={HOME_FAQ} title="Frequently asked questions" />
      <CtaBand isSignedIn={isSignedIn} />
    </>
  );
}
