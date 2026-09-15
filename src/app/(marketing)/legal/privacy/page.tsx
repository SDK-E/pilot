import {
  LEGAL_JURISDICTION,
  ORGANIZATION_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
} from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `${ORGANIZATION_NAME}'s Privacy Policy for Pilot.`,
  alternates: { canonical: `${SITE_URL}/legal/privacy` },
  robots: { index: false },
};

const LAST_UPDATED = "[DATE — TBD, set when this page is reviewed by counsel]";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p className="rounded-md border border-dashed bg-muted/40 p-4 text-xs">
          This page is a structural draft, not a final legal document. Fields
          marked <strong>TBD</strong> need review by {ORGANIZATION_NAME}
          &apos;s legal counsel and Data Protection Officer before this goes
          live.
        </p>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            1. Who controls your data
          </h2>
          <p>
            {ORGANIZATION_NAME} ({LEGAL_JURISDICTION}) is the data controller
            for Pilot.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            2. What we collect
          </h2>
          <p>
            Account and organization membership data (via WorkOS), conversations
            and files you create in Pilot, and basic operational data needed to
            run the service.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            3. How your data is scoped
          </h2>
          <p>
            Conversations, projects, and files are private to the person who
            created them within your organization. Other members of your
            organization do not gain access to your data by virtue of membership
            alone.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            4. Subprocessors
          </h2>
          <p>Pilot relies on the following subprocessors to operate:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>WorkOS — authentication and organization membership.</li>
            <li>Neon — database hosting.</li>
            <li>Vercel — application hosting and deployment.</li>
            <li>
              The AI model provider(s) that power Pilot&apos;s agent runtime.
              [TBD: name the specific provider(s) here before launch.]
            </li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            5. Data retention
          </h2>
          <p>[TBD: retention periods, reviewed by counsel.]</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            6. Your rights
          </h2>
          <p>
            [TBD: rights under applicable law — e.g. access, correction,
            deletion, portability — and how to exercise them.]
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">7. Contact</h2>
          <p>
            Privacy questions or requests:{" "}
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
