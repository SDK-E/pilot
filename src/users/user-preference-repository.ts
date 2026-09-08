import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { userPreferences } from "@/db/schema";
import {
  defaultUserPreferences,
  type SendMessageShortcut,
} from "@/users/user-preferences";

export type { SendMessageShortcut } from "@/users/user-preferences";

export async function getUserPreferences(workosUserId: string) {
  const [preferences] = await db
    .select({ sendMessageShortcut: userPreferences.sendMessageShortcut })
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
    .returning({ sendMessageShortcut: userPreferences.sendMessageShortcut });
  return preferences;
}
