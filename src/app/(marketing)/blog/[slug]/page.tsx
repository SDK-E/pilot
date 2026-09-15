import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentSections } from "@/components/marketing/content-sections";
import { JsonLd } from "@/components/marketing/json-ld";
import { BLOG_POSTS } from "@/marketing/content";
import { ORGANIZATION_NAME, SITE_URL } from "@/marketing/site-config";

import type { Metadata } from "next";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((entry) => entry.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((entry) => entry.slug === slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        className="text-xs text-muted-foreground hover:text-foreground"
        href="/blog"
      >
        ← Blog
      </Link>
      <p className="mt-3 text-xs font-medium text-primary">
        {post.publishedLabel}
      </p>
      <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        {post.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{post.summary}</p>
      <ContentSections sections={post.sections} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.summary,
          author: { "@type": "Organization", name: ORGANIZATION_NAME },
          url: `${SITE_URL}/blog/${post.slug}`,
        }}
      />
    </article>
  );
}
