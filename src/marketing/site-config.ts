/**
 * Public site config for canonical URLs, sitemap/robots, and JSON-LD.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pilot.sdk.enterprises"
).replace(/\/$/, "");

export const SITE_NAME = "Pilot";
export const ORGANIZATION_NAME = "SDK Enterprises";

/**
 * Used consistently across Contact, Terms, and Privacy so there's one
 * place to change it.
 */
export const SUPPORT_EMAIL = "hello@sdk.enterprises";

export const LEGAL_JURISDICTION = "France";
