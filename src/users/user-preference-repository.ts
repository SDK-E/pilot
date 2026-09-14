import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { userPreferences } from "@/db/schema";
import {
  defaultUserPreferences,
  type ConversationPanelLayout,
  type SendMessageShortcut,
} from "@/users/user-preferences";

export type { SendMessageShortcut } from "@/users/user-preferences";

const selectedColumns = {
  sendMessageShortcut: userPreferences.sendMessageShortcut,
  conversationPanelLayout: userPreferences.conversationPanelLayout,
};

export async function getUserPreferences(workosUserId: string) {
  const [preferences] = await db
    .select(selectedColumns)
    .from(userPreferences)
    .where(eq(userPreferences.workosUserId, workosUserId))
    .limit(1);
  return preferences ?? defaultUserPreferences;
}

export async function updateUserPreferences(input: {
  workosUserId: string;
  sendMessageShortcut: SendMessageShortcut;
}) {
  const [preferences] = await db
    .insert(userPreferences)
    .values(input)
    .onConflictDoUpdate({
      target: userPreferences.workosUserId,
      set: {
        sendMessageShortcut: input.sendMessageShortcut,
        updatedAt: new Date(),
      },
    })
    .returning(selectedColumns);
  return preferences;
}

export async function updateConversationPanelLayout(input: {
  workosUserId: string;
  conversationPanelLayout: ConversationPanelLayout;
}) {
  const [preferences] = await db
    .insert(userPreferences)
    .values({
      workosUserId: input.workosUserId,
      sendMessageShortcut: defaultUserPreferences.sendMessageShortcut,
      conversationPanelLayout: input.conversationPanelLayout,
    })
    .onConflictDoUpdate({
      target: userPreferences.workosUserId,
      set: {
        conversationPanelLayout: input.conversationPanelLayout,
        updatedAt: new Date(),
      },
    })
    .returning(selectedColumns);
  return preferences;
}
