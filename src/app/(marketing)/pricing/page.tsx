import { withAuth } from "@workos-inc/authkit-nextjs";

import { FaqSection } from "@/components/marketing/faq-section";
import { JsonLd } from "@/components/marketing/json-ld";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Badge } from "@/components/ui/badge";
import { PRICING_FAQ } from "@/marketing/faq";
import { PRICING_PLANS } from "@/marketing/pricing-plans";
import { SITE_NAME, SITE_URL } from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Pilot pricing: Free for Chat, 5€/month adds Work, 20€/month for Chat, Work, and Code. Free during early access.",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

export default async function PricingPage() {
  const { user } = await withAuth();
  const isSignedIn = Boolean(user);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple, usage-based pricing
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Start with Chat for free. Add Work or the full Chat, Work, and Code
          plan when you need more.
        </p>
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-md border bg-muted/40 px-4 py-3">
        <Badge>Free during early access</Badge>
        <p className="text-xs text-muted-foreground">
          Billing isn&apos;t live yet, so every plan below is free to use today.
          You&apos;ll be told before any charge ever applies to your account.
        </p>
      </div>
      <div className="mt-8">
        <PricingTable isSignedIn={isSignedIn} />
      </div>
      <FaqSection items={PRICING_FAQ} title="Pricing questions" />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          applicationCategory: "BusinessApplication",
          offers: PRICING_PLANS.map((plan) => ({
            "@type": "Offer",
            name: plan.name,
            price: plan.priceLabel.replace("€", ""),
            priceCurrency: "EUR",
            description: plan.description,
          })),
        }}
      />
    </div>
  );
}
