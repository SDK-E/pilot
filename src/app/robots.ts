import { SITE_URL } from "@/marketing/site-config";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/chat",
        "/work",
        "/code",
        "/projects",
        "/agents",
        "/settings",
        "/workspace",
        "/onboarding",
        "/api/",
        "/legal/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
