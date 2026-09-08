export type SendMessageShortcut = "enter" | "mod_enter";

export const defaultUserPreferences = {
  sendMessageShortcut: "mod_enter",
} as const satisfies { sendMessageShortcut: SendMessageShortcut };
