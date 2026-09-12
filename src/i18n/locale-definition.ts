export type TextDirection = "ltr" | "rtl" | "auto";

export type Coverage = "complete" | "partial" | "minimal" | "none";
export type LocaleStatus = "stable" | "beta" | "experimental" | "deprecated";

export type LocaleDefinition = {
  tag: string;
  nativeName: string;
  englishName: string;
  direction: TextDirection;
  fallback: string | null;
  status: LocaleStatus;
  coverage: Coverage;
  available: boolean;
};
