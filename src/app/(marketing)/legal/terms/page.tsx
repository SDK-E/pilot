import {
  LEGAL_JURISDICTION,
  ORGANIZATION_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
} from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `${ORGANIZATION_NAME}'s Terms of Service for Pilot.`,
  alternates: { canonical: `${SITE_URL}/legal/terms` },
  robots: { index: false },
};

const LAST_UPDATED = "[DATE — TBD, set when this page is reviewed by counsel]";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p className="rounded-md border border-dashed bg-muted/40 p-4 text-xs">
          This page is a structural draft, not a final legal document. Fields
          marked <strong>TBD</strong> need review by {ORGANIZATION_NAME}
          &apos;s legal counsel before this goes live.
        </p>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            1. Who these terms are with
          </h2>
          <p>
            Pilot is provided by {ORGANIZATION_NAME}, incorporated in{" "}
            {LEGAL_JURISDICTION}. These terms govern your use of Pilot&apos;s
            website and product.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            2. Your account
          </h2>
          <p>
            You sign in through WorkOS. You&apos;re responsible for activity
            under your account and for keeping your sign-in credentials secure.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            3. Early access and pricing
          </h2>
          <p>
            Pilot is in early access. Published pricing (see the Pricing page)
            reflects what plans will cost once billing launches; no payment is
            currently collected, and you&apos;ll be notified before any charge
            applies to your account.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            4. Acceptable use
          </h2>
          <p>
            Don&apos;t use Pilot to violate the law, attempt to access another
            organization&apos;s data, or interfere with the service&apos;s
            operation. [TBD: full acceptable-use list, reviewed by counsel.]
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            5. Service availability
          </h2>
          <p>
            Pilot is under active development and offered as-is during early
            access, without uptime guarantees. [TBD: SLA terms once defined.]
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            6. Termination
          </h2>
          <p>
            You may stop using Pilot at any time. {ORGANIZATION_NAME} may
            suspend or terminate access for violation of these terms. [TBD:
            data-retention window after account closure.]
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            7. Governing law
          </h2>
          <p>[TBD: governing law and dispute-resolution venue.]</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">8. Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
