import type { LocaleDefinition, TextDirection } from "./locale-definition";

export const locales: readonly LocaleDefinition[] = [
  {
    tag: "en",
    nativeName: "English",
    englishName: "English",
    direction: "ltr",
    fallback: null,
    status: "stable",
    coverage: "complete",
    available: true,
  },
  {
    tag: "fr",
    nativeName: "Français",
    englishName: "French",
    direction: "ltr",
    fallback: "en",
    status: "stable",
    coverage: "complete",
    available: true,
  },
  {
    tag: "ar",
    nativeName: "العربية",
    englishName: "Arabic",
    direction: "rtl",
    fallback: "en",
    status: "beta",
    coverage: "complete",
    available: true,
  },
] as const;

export function getLocale(tag: string): LocaleDefinition | undefined {
  return locales.find((locale) => locale.tag === tag);
}

export function isLocaleComplete(tag: string): boolean {
  const locale = getLocale(tag);
  return locale?.coverage === "complete" && locale.available === true;
}

export function isRTL(tag: string): boolean {
  return getLocale(tag)?.direction === "rtl";
}

export function getDirection(tag: string): TextDirection {
  return getLocale(tag)?.direction ?? "ltr";
}
