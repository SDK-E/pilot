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

/**
 * French company registration details, required on the Mentions Légales
 * page (LCEN) and referenced from Terms/Privacy's "who this is" sections.
 */
export const LEGAL_ENTITY = {
  tradingName: "SDK Enterprises",
  registeredName: "SADDEK Entreprises",
  siren: "850 513 912",
  siret: "850 513 912 00020",
  vatNumber: "FR10850513912",
  registeredAddress: "44 rue Pasquier, 75008 Paris, France",
  publicationDirector: "Hicham SADDEK, Founder",
  publicationDirectorEmail: "hicham@sdk.enterprises",
} as const;

export const HOSTING_PROVIDER = {
  name: "Vercel Inc.",
  address: "340 S Lemon Ave #4133, Walnut, CA 91789, USA",
} as const;
