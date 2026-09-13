export type SendMessageShortcut = "enter" | "mod_enter";

export type ConversationPanelLayout = {
  conversation: number;
  details: number;
};

export const defaultUserPreferences = {
  sendMessageShortcut: "mod_enter",
  uiLocale: null as string | null,
  conversationPanelLayout: null as ConversationPanelLayout | null,
} as const satisfies {
  sendMessageShortcut: SendMessageShortcut;
  uiLocale: string | null;
  conversationPanelLayout: ConversationPanelLayout | null;
};
