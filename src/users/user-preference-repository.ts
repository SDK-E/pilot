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
  workInstructions: userPreferences.workInstructions,
  generalInstructions: userPreferences.generalInstructions,
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

/**
 * The user's standing Work instructions only, for the runtime request path —
 * selects one column rather than the full preferences row on every turn.
 */
export async function getWorkInstructions(
  workosUserId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ workInstructions: userPreferences.workInstructions })
    .from(userPreferences)
    .where(eq(userPreferences.workosUserId, workosUserId))
    .limit(1);
  return row?.workInstructions ?? null;
}

export async function updateWorkInstructions(input: {
  workosUserId: string;
  workInstructions: string | null;
}) {
  const [preferences] = await db
    .insert(userPreferences)
    .values({
      workosUserId: input.workosUserId,
      sendMessageShortcut: defaultUserPreferences.sendMessageShortcut,
      workInstructions: input.workInstructions,
    })
    .onConflictDoUpdate({
      target: userPreferences.workosUserId,
      set: {
        workInstructions: input.workInstructions,
        updatedAt: new Date(),
      },
    })
    .returning(selectedColumns);
  return preferences;
}

/**
 * The user's general instructions only, for the runtime request path — reach
 * every agent kind (Chat, Work, Code), unlike `getWorkInstructions`.
 */
export async function getGeneralInstructions(
  workosUserId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ generalInstructions: userPreferences.generalInstructions })
    .from(userPreferences)
    .where(eq(userPreferences.workosUserId, workosUserId))
    .limit(1);
  return row?.generalInstructions ?? null;
}

export async function updateGeneralInstructions(input: {
  workosUserId: string;
  generalInstructions: string | null;
}) {
  const [preferences] = await db
    .insert(userPreferences)
    .values({
      workosUserId: input.workosUserId,
      sendMessageShortcut: defaultUserPreferences.sendMessageShortcut,
      generalInstructions: input.generalInstructions,
    })
    .onConflictDoUpdate({
      target: userPreferences.workosUserId,
      set: {
        generalInstructions: input.generalInstructions,
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
