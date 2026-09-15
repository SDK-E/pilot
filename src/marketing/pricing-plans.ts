/**
 * Real pricing tiers for Pilot. No Stripe integration exists yet, so every
 * plan's call to action is a free sign-up — see the "free during early
 * access" banner on the Pricing page. Nothing here should imply a checkout
 * or an automatic future charge.
 */
export interface PricingPlan {
  id: "free" | "work" | "full";
  name: string;
  priceLabel: string;
  billingNote: string;
  description: string;
  features: readonly string[];
  cta: string;
  highlighted?: boolean;
}

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "€0",
    billingNote: "per month",
    description: "Chat with Pilot for everyday questions and drafting.",
    features: [
      "Pilot Chat mode",
      "Unlimited conversations",
      "Private, creator-scoped history",
    ],
    cta: "Get started free",
  },
  {
    id: "work",
    name: "Work",
    priceLabel: "€5",
    billingNote: "per month, adds Work",
    description: "Chat, plus an agent that plans and works through tasks.",
    features: [
      "Everything in Free",
      "Pilot Work mode",
      "Visible step-by-step plans",
    ],
    cta: "Get started free",
    highlighted: true,
  },
  {
    id: "full",
    name: "Chat + Work + Code",
    priceLabel: "€20",
    billingNote: "per month, full access",
    description: "The complete set: chat, work, and code together.",
    features: [
      "Everything in Work",
      "Pilot Code mode",
      "Read, explain, and propose code changes as reviewable diffs",
    ],
    cta: "Get started free",
  },
];
