"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { updateConversationPanelLayout } from "@/users/user-preference-repository";

const panelLayoutSchema = z.object({
  conversation: z.number().min(20).max(90),
  details: z.number().min(10).max(80),
});

export async function updateConversationPanelLayoutAction(input: {
  conversation: number;
  details: number;
}) {
  const parsed = panelLayoutSchema.safeParse(input);
  if (!parsed.success) return;

  const { user } = await withAuth({ ensureSignedIn: true });
  await updateConversationPanelLayout({
    workosUserId: user.id,
    conversationPanelLayout: parsed.data,
  });
}
