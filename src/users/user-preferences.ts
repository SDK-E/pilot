export type SendMessageShortcut = "enter" | "mod_enter";

export interface ConversationPanelLayout {
  conversation: number;
  details: number;
}

export const defaultUserPreferences = {
  sendMessageShortcut: "mod_enter",
  conversationPanelLayout: null as ConversationPanelLayout | null,
} as const satisfies {
  sendMessageShortcut: SendMessageShortcut;
  conversationPanelLayout: ConversationPanelLayout | null;
};
