export type SendMessageShortcut = "enter" | "mod_enter";

export const defaultUserPreferences = {
  sendMessageShortcut: "mod_enter",
  uiLocale: null as string | null,
} as const satisfies {
  sendMessageShortcut: SendMessageShortcut;
  uiLocale: string | null;
};
