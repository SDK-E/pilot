---
name: seo
description: Use when working on Pilot's public-facing pages' discoverability by traditional search engines — metadata, sitemaps, robots.txt, structured data, page titles/descriptions.
---

# SEO for Pilot

Pilot's authenticated surface (`/chat`, `/work`, `/code`, `/agents`, `/projects`, `/settings`) is behind WorkOS auth and matched in `src/proxy.ts` — none of it should be indexed. SEO work here is scoped to the small public surface: the marketing/sign-in landing (`/`, unauthenticated per `middlewareAuth.unauthenticatedPaths` in `src/proxy.ts`) and any future public marketing pages.

## Next.js App Router metadata

- Use the built-in Metadata API (`export const metadata` or `generateMetadata`) in the relevant `page.tsx`/`layout.tsx` under `src/app/` — not manual `<head>` tags. Set `title`, `description`, `openGraph`, and `robots` per route.
- Every authenticated route group should carry `robots: { index: false, follow: false }` (or an equivalent `noindex` metadata entry) so it can never be indexed even if middleware is ever misconfigured — treat this as defense in depth alongside `src/proxy.ts`, not a replacement for it.
- Only the public landing route(s) should allow indexing.

## Structured data

- If adding JSON-LD, inject it via a server component rendering a `<script type="application/ld+json">` with server-generated content only — never client state or user-submitted data (consistent with AGENTS.md's rule against trusting browser-supplied content).
- Use `Organization`/`SoftwareApplication` schema types for the product marketing page if one exists; don't fabricate review/rating structured data.

## Practical checklist for a new public page

1. `generateMetadata` with a real `title`/`description` (no placeholder lorem text).
2. Confirm the route is **not** in `src/proxy.ts`'s matcher (or is explicitly in `unauthenticatedPaths`) before treating it as public.
3. Add it to a sitemap only if it's meant to be crawled.
