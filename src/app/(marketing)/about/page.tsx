import Link from "next/link";

import { SITE_URL } from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Pilot is built by SDK Enterprises: one AI workspace for chat, task work, and code, instead of three separate tools.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        About Pilot
      </h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          Pilot is built by SDK Enterprises. We started it because the usual
          setup — a chat assistant here, a task tool there, a separate coding
          assistant somewhere else — loses context every time you switch between
          them. Pilot keeps Chat, Work, and Code in one workspace instead.
        </p>
        <p>
          Every conversation, project, and file in Pilot is private to the
          person who created it within your organization. Being a teammate
          doesn&apos;t grant access to someone else&apos;s conversations —
          that&apos;s a deliberate design decision, not a default we happened to
          ship with.
        </p>
        <p>
          Pilot is currently in early access: the product works, pricing is
          published on the{" "}
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href="/pricing"
          >
            Pricing page
          </Link>
          , and billing hasn&apos;t launched yet, so every plan is free to use
          right now.
        </p>
        <p>
          Questions before you sign up? Reach out on the{" "}
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href="/contact"
          >
            Contact page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
