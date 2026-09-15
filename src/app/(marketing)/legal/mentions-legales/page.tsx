import Link from "next/link";

import {
  HOSTING_PROVIDER,
  LEGAL_ENTITY,
  SITE_URL,
  SUPPORT_EMAIL,
} from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Legal notice for the Pilot website, required under French law.",
  alternates: { canonical: `${SITE_URL}/legal/mentions-legales` },
  robots: { index: false },
};

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        Mentions légales
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">
        Legal notice, published as required under French law (LCEN).
      </p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            Site publisher
          </h2>
          <p>
            {LEGAL_ENTITY.registeredName}, trading as {LEGAL_ENTITY.tradingName}
            .
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>SIREN: {LEGAL_ENTITY.siren}</li>
            <li>SIRET: {LEGAL_ENTITY.siret}</li>
            <li>VAT number: {LEGAL_ENTITY.vatNumber}</li>
            <li>Registered office: {LEGAL_ENTITY.registeredAddress}</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            Publication director
          </h2>
          <p>
            {LEGAL_ENTITY.publicationDirector} —{" "}
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href={`mailto:${LEGAL_ENTITY.publicationDirectorEmail}`}
            >
              {LEGAL_ENTITY.publicationDirectorEmail}
            </a>
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            Hosting provider
          </h2>
          <p>
            {HOSTING_PROVIDER.name}, {HOSTING_PROVIDER.address}.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Contact</h2>
          <p>
            General questions:{" "}
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
            . For data protection and privacy matters, see the{" "}
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/legal/privacy"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
