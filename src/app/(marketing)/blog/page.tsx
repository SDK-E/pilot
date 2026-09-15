import { BLOG_POSTS } from "@/marketing/content";
import { SITE_URL } from "@/marketing/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Updates from the Pilot team at SDK Enterprises.",
  alternates: { canonical: `${SITE_URL}/blog` },
};

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        Blog
      </h1>
      <ul className="mt-8 space-y-6">
        {BLOG_POSTS.map((post) => (
          <li className="border-b pb-6" key={post.slug}>
            <p className="text-xs font-medium text-primary">
              {post.publishedLabel}
            </p>
            <a
              className="mt-1 block font-heading text-lg font-medium hover:underline"
              href={`/blog/${post.slug}`}
            >
              {post.title}
            </a>
            <p className="mt-1 text-sm text-muted-foreground">{post.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
