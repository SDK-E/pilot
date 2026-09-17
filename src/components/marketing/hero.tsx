import { RiArrowRightUpLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";

import { HeroDiagram } from "./hero-diagram";

/**
 * The page's single primary call to action. Its accessible name
 * ("Sign in to Pilot" / "Open workspace") must stay unique on the page —
 * SiteNav intentionally uses shorter labels so this stays the one match for
 * `getByRole("link", { name: ... })` in the Playwright suite.
 */
export function Hero({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="max-w-2xl space-y-6">
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-6xl">
            Ask fast. Ship faster.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Pilot answers your questions, plans and runs the work behind them,
            and turns code changes into diffs you can actually review — with the
            plan visible before it acts. Free to start, no credit card.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <a href={isSignedIn ? "/chat" : "/sign-in"}>
                {isSignedIn ? "Open workspace" : "Sign in to Pilot"}
                <RiArrowRightUpLine aria-hidden="true" />
              </a>
            </Button>
            <a
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              href="#how-it-works"
            >
              See how it works
            </a>
          </div>
        </div>
        <div className="hidden justify-self-center lg:flex">
          <HeroDiagram />
        </div>
      </div>
    </section>
  );
}
