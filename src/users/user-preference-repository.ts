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
    .select({
      sendMessageShortcut: userPreferences.sendMessageShortcut,
      uiLocale: userPreferences.uiLocale,
    })
    .from(userPreferences)
    .where(eq(userPreferences.workosUserId, workosUserId))
    .limit(1);
  return preferences ?? defaultUserPreferences;
}

export async function updateUserPreferences(
  input: {
    workosUserId: string;
    sendMessageShortcut: SendMessageShortcut;
  } & ({ uiLocale: string | null } | { uiLocale?: undefined }),
) {
  const [preferences] = await db
    .insert(userPreferences)
    .values(input)
    .onConflictDoUpdate({
      target: userPreferences.workosUserId,
      set: {
        sendMessageShortcut: input.sendMessageShortcut,
        uiLocale: "uiLocale" in input ? input.uiLocale : undefined,
        updatedAt: new Date(),
      },
    })
    .returning({
      sendMessageShortcut: userPreferences.sendMessageShortcut,
      uiLocale: userPreferences.uiLocale,
    });
  return preferences;
}
