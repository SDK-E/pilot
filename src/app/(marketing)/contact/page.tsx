import { RiMailLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { SITE_URL, SUPPORT_EMAIL } from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Pilot team at SDK Enterprises.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        Contact
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        Questions about Pilot, pricing, or your data — email us and a person
        will reply.
      </p>
      <Button asChild className="mt-6" size="lg">
        <a href={`mailto:${SUPPORT_EMAIL}`}>
          <RiMailLine aria-hidden="true" />
          {SUPPORT_EMAIL}
        </a>
      </Button>
    </div>
  );
}
