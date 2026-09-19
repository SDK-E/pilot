export type SendMessageShortcut = "enter" | "mod_enter";

export interface ConversationPanelLayout {
  conversation: number;
  details: number;
}

export const defaultUserPreferences = {
  sendMessageShortcut: "mod_enter",
  conversationPanelLayout: null as ConversationPanelLayout | null,
  workInstructions: null as string | null,
  generalInstructions: null as string | null,
} as const satisfies {
  sendMessageShortcut: SendMessageShortcut;
  conversationPanelLayout: ConversationPanelLayout | null;
  workInstructions: string | null;
  generalInstructions: string | null;
};
