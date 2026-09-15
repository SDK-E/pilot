import { DOCS_PAGES } from "@/marketing/content";
import { SITE_URL } from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs",
  description: "How Pilot's modes, tools, and data model work.",
  alternates: { canonical: `${SITE_URL}/docs` },
};

export default function DocsIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        Docs
      </h1>
      <ul className="mt-8 space-y-4">
        {DOCS_PAGES.map((doc) => (
          <li className="rounded-md border p-4" key={doc.slug}>
            <a
              className="font-heading text-base font-medium hover:underline"
              href={`/docs/${doc.slug}`}
            >
              {doc.title}
            </a>
            <p className="mt-1 text-sm text-muted-foreground">{doc.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
