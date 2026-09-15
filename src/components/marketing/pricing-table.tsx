import { RiCheckLine } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PRICING_PLANS } from "@/marketing/pricing-plans";

export function PricingTable({ isSignedIn }: { isSignedIn: boolean }) {
  const ctaHref = isSignedIn ? "/chat" : "/sign-in";

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {PRICING_PLANS.map((plan) => (
        <Card
          className={plan.highlighted ? "ring-2 ring-primary" : undefined}
          key={plan.id}
        >
          <CardHeader>
            {plan.highlighted ? (
              <Badge className="w-fit">Most popular</Badge>
            ) : null}
            <CardTitle className="mt-2 text-base">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="font-heading text-3xl font-semibold">
                {plan.priceLabel}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                {plan.billingNote}
              </span>
            </div>
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li
                  className="flex items-start gap-2 text-xs text-foreground"
                  key={feature}
                >
                  <RiCheckLine
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-primary"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <a href={ctaHref}>{plan.cta}</a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
