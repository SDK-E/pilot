import { BLOG_POSTS, DOCS_PAGES } from "@/marketing/content";
import { SITE_URL } from "@/marketing/site-config";

import type { MetadataRoute } from "next";

const STATIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/pricing", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/docs", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly" as const, priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
  const docEntries = DOCS_PAGES.map((doc) => ({
    url: `${SITE_URL}/docs/${doc.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
  const blogEntries = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...docEntries, ...blogEntries];
}
