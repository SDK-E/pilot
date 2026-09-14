export interface LocaleDefinition {
  /**
  BCP 47 tag.
  */
  tag: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}
