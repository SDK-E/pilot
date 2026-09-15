import Link from "next/link";

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

const LAST_UPDATED = "September 15, 2026";

function DataHandlingSections() {
  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          1. Who controls your data
        </h2>
        <p>
          {ORGANIZATION_NAME} ({LEGAL_JURISDICTION}) is the data controller for
          Pilot. Full registration details are on the{" "}
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href="/legal/mentions-legales"
          >
            Mentions légales
          </Link>{" "}
          page.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          2. What we collect, and why
        </h2>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            Account and organization membership data (via WorkOS) — to create
            your account and let you sign in (processing necessary to perform
            our contract with you).
          </li>
          <li>
            Conversations, projects, and files you create in Pilot — to provide
            the core service you asked for (contract performance).
          </li>
          <li>
            Basic operational data (e.g. request logs) — to run, secure, and
            troubleshoot the service (our legitimate interest in keeping Pilot
            working and secure).
          </li>
        </ul>
        <p>We don&apos;t sell your personal data.</p>
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
            KiloCode — the AI model provider powering Pilot&apos;s agent
            runtime.
          </li>
        </ul>
        <p>
          A data processing agreement covering these subprocessors is available
          on request at{" "}
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          5. International data transfers
        </h2>
        <p>
          Where a subprocessor processes your data outside the European Economic
          Area, we require it to rely on an approved safeguard — such as the
          European Commission&apos;s Standard Contractual Clauses or an adequacy
          decision — before that transfer happens.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          6. Data retention
        </h2>
        <p>
          We keep your conversations, projects, and files for as long as your
          account is active. After you close your account, we retain this data
          for up to 30 days (to allow recovery from accidental closure or
          billing errors), then delete it, except where we&apos;re required by
          law to keep it longer. Basic operational logs needed to run and secure
          the service are kept for a limited period on a rolling basis.
        </p>
      </section>
    </>
  );
}

function RightsAndContactSections() {
  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          7. Your rights
        </h2>
        <p>
          Because {ORGANIZATION_NAME} is based in France, you have rights under
          the EU General Data Protection Regulation (GDPR), including the right
          to:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate or incomplete data.</li>
          <li>
            Request deletion of your data (&ldquo;right to be forgotten&rdquo;).
          </li>
          <li>Receive a portable copy of your data.</li>
          <li>Object to, or request that we restrict, certain processing.</li>
          <li>
            Lodge a complaint with a supervisory authority — in France, the{" "}
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href="https://www.cnil.fr/"
            >
              CNIL
            </a>
            .
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">8. Contact</h2>
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
    </>
  );
}

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
        <DataHandlingSections />
        <RightsAndContactSections />
      </div>
    </div>
  );
}
