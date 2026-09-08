"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateUserPreferences } from "@/users/user-preference-repository";

const inputSchema = z.object({
  sendMessageShortcut: z.enum(["enter", "mod_enter"]),
});

export async function updateMessageShortcutAction(formData: FormData) {
  const input = inputSchema.safeParse({
    sendMessageShortcut: formData.get("sendMessageShortcut"),
  });
  if (!input.success) return;

  const { user } = await withAuth({ ensureSignedIn: true });
  await updateUserPreferences({
    workosUserId: user.id,
    sendMessageShortcut: input.data.sendMessageShortcut,
  });
  revalidatePath("/workspace", "layout");
}
