import Link from "next/link";

import { PRICING_PLANS } from "@/marketing/pricing-plans";

/**
 * A condensed pointer to the real Pricing page, not a duplicate of
 * `pricing-table.tsx` — three price points plus a link, so the homepage
 * doesn't have to maintain its own copy of the plan data.
 */
export function PricingTeaser() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Free during early access, and priced simply after.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Every plan is free to use right now. Billing isn&apos;t live yet.
        </p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <div className="rounded-lg border p-5" key={plan.id}>
            <p className="text-sm font-medium">{plan.name}</p>
            <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">
              {plan.priceLabel}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {plan.billingNote}
              </span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {plan.description}
            </p>
          </div>
        ))}
      </div>
      <Link
        className="mt-6 inline-block text-sm font-medium underline underline-offset-4 hover:text-foreground"
        href="/pricing"
      >
        See full plan details
      </Link>
    </section>
  );
}
