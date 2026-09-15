"use client";

import { RiArrowRightUpLine, RiMenuLine } from "@remixicon/react";
import Link from "next/link";
import * as React from "react";

import { PilotWordmark } from "@/components/brand/pilot-wordmark";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MARKETING_NAV_LINKS } from "@/marketing/nav-links";

/**
 * Public marketing header: brand mark, section links, theme switcher, and
 * an auth-aware call to action. Desktop shows links inline; narrow
 * viewports collapse them into a Sheet so the header never overflows.
 */
export function SiteNav({ isSignedIn }: { isSignedIn: boolean }) {
  const [open, setOpen] = React.useState(false);
  const ctaHref = isSignedIn ? "/chat" : "/sign-in";
  // Short nav-only labels: the page's primary CTA (in the Hero) uses the
  // full "Sign in to Pilot" / "Open workspace" text, and Playwright's
  // getByRole name matching requires that text to stay unique on the page.
  const ctaLabel = isSignedIn ? "Workspace" : "Sign in";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link aria-label="Pilot home" className="flex items-center" href="/">
          <PilotWordmark className="text-base" />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {MARKETING_NAV_LINKS.map((link) => (
            <Link
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Button asChild className="hidden sm:inline-flex" size="sm">
            <Link href={ctaHref}>
              {ctaLabel}
              <RiArrowRightUpLine aria-hidden="true" />
            </Link>
          </Button>
          <Sheet onOpenChange={setOpen} open={open}>
            <SheetTrigger asChild>
              <Button
                aria-label="Open menu"
                className="md:hidden"
                size="icon"
                variant="ghost"
              >
                <RiMenuLine aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Mobile"
                className="flex flex-col gap-1 px-6 pb-6"
              >
                {MARKETING_NAV_LINKS.map((link) => (
                  <Link
                    className="rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    href={link.href}
                    key={link.href}
                    onClick={() => {
                      setOpen(false);
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
                <Button asChild className="mt-3 sm:hidden">
                  <Link href={ctaHref}>{ctaLabel}</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
