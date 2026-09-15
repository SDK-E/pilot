/**
 * Public site config for canonical URLs, sitemap/robots, and JSON-LD.
 * `NEXT_PUBLIC_SITE_URL` isn't set anywhere yet — confirm the real
 * production domain and add it before launch; this fallback is a
 * placeholder guess based on `PILOT_AI_RUNTIME_URL`'s `ai.` subdomain
 * convention, not a confirmed value.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pilot.sdk.enterprises"
).replace(/\/$/, "");

export const SITE_NAME = "Pilot";
export const ORGANIZATION_NAME = "SDK Enterprises";

/**
 * Placeholder — confirm the real support inbox before launch. Used
 * consistently across Contact, Terms, and Privacy so there's one place to
 * fix it.
 */
export const SUPPORT_EMAIL = "support@sdk.enterprises";

/**
 * Placeholder — confirm the entity's real jurisdiction before launch.
 */
export const LEGAL_JURISDICTION = "[JURISDICTION — TBD]";
