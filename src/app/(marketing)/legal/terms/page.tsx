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

const LAST_UPDATED = "September 15, 2026";

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
          <p>You agree not to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Use Pilot to violate any applicable law or regulation.</li>
            <li>
              Attempt to access another organization&apos;s or another
              member&apos;s data, or bypass Pilot&apos;s access controls.
            </li>
            <li>
              Probe, scan, or test the vulnerability of Pilot&apos;s systems
              without authorization, or interfere with the service&apos;s normal
              operation (including denial-of-service activity).
            </li>
            <li>
              Reverse engineer, decompile, or attempt to extract Pilot&apos;s
              source code, except where applicable law gives you that right.
            </li>
            <li>
              Use Pilot to generate content that is unlawful, infringing, or
              intended to harass, defraud, or harm others.
            </li>
            <li>
              Resell, sublicense, or provide Pilot to third parties as your own
              service without {ORGANIZATION_NAME}&apos;s written consent.
            </li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            5. Service availability
          </h2>
          <p>
            Pilot is under active development and offered as-is during early
            access. {ORGANIZATION_NAME} uses reasonable efforts to keep the
            service available and to give advance notice of planned maintenance,
            but does not guarantee uninterrupted uptime during this period. A
            formal service-level commitment will be published if and when one
            applies to paid plans.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            6. Termination
          </h2>
          <p>
            You may stop using Pilot and close your account at any time.{" "}
            {ORGANIZATION_NAME} may suspend or terminate your access for
            violating these terms, with notice where reasonably practicable.
            After your account closes, {ORGANIZATION_NAME} retains your
            conversations, projects, and files for up to 30 days (to allow
            recovery from accidental closure or billing errors), then deletes
            them, except where retention is required by law.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            7. Governing law
          </h2>
          <p>
            These terms are governed by French law. Any dispute that can&apos;t
            be resolved informally will be subject to the exclusive jurisdiction
            of the courts of France, without prejudice to any mandatory
            consumer-protection rights you have under the law of your country of
            residence if you are a consumer within the European Union.
          </p>
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
