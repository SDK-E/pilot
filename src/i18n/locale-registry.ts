import type { LocaleDefinition } from "./locale-definition";

/**
Languages the interface can be set to.
*/
export const locales: readonly LocaleDefinition[] = [
  { tag: "en", nativeName: "English", direction: "ltr" },
  { tag: "fr", nativeName: "Français", direction: "ltr" },
  { tag: "ar", nativeName: "العربية", direction: "rtl" },
];
