import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentSections } from "@/components/marketing/content-sections";
import { JsonLd } from "@/components/marketing/json-ld";
import { DOCS_PAGES } from "@/marketing/content";
import { SITE_URL } from "@/marketing/site-config";

import type { Metadata } from "next";

export function generateStaticParams() {
  return DOCS_PAGES.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS_PAGES.find((page) => page.slug === slug);
  if (!doc) return {};
  return {
    title: doc.title,
    description: doc.summary,
    alternates: { canonical: `${SITE_URL}/docs/${doc.slug}` },
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS_PAGES.find((page) => page.slug === slug);
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        className="text-xs text-muted-foreground hover:text-foreground"
        href="/docs"
      >
        ← Docs
      </Link>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        {doc.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{doc.summary}</p>
      <ContentSections sections={doc.sections} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Docs",
              item: `${SITE_URL}/docs`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: doc.title,
              item: `${SITE_URL}/docs/${doc.slug}`,
            },
          ],
        }}
      />
    </div>
  );
}
