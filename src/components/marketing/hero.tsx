import { RiArrowRightUpLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";

/**
 * The page's single primary call to action. Its accessible name
 * ("Sign in to Pilot" / "Open workspace") must stay unique on the page —
 * SiteNav intentionally uses shorter labels so this stays the one match for
 * `getByRole("link", { name: ... })` in the Playwright suite.
 */
export function Hero({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-2xl space-y-6">
        <p className="text-xs font-medium text-primary">AI workspace</p>
        <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-6xl">
          Give your team a place to chat, work, and code with AI.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Stop switching between a chatbot, a task tracker, and a coding tool.
          Pilot answers questions, plans and runs multi-step work, and reviews
          code — in one place, with nothing to install. Free to start, no credit
          card required.
        </p>
        <Button asChild size="lg">
          <a href={isSignedIn ? "/chat" : "/sign-in"}>
            {isSignedIn ? "Open workspace" : "Sign in to Pilot"}
            <RiArrowRightUpLine aria-hidden="true" />
          </a>
        </Button>
      </div>
    </section>
  );
}
