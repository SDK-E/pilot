"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PilotAiRuntimeError } from "@/ai/pilot-ai-client";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { sendConversationMessage } from "@/conversations/send-message";
import { getConversation } from "@/conversations/conversation-repository";
import { getWorker } from "@/workers/worker-repository";

const messageInputSchema = z.object({
  workerId: z.uuid(),
  conversationId: z.uuid(),
  message: z.string().trim().min(1, "A message is required.").max(10_000),
});

export type ConversationMessageState = {
  message?: string;
  status: "error" | "success" | "idle";
};

export async function sendConversationMessageAction(
  _previousState: ConversationMessageState,
  formData: FormData,
): Promise<ConversationMessageState> {
  const input = messageInputSchema.safeParse({
    workerId: formData.get("workerId"),
    conversationId: formData.get("conversationId"),
    message: formData.get("message"),
  });
  if (!input.success) {
    return { message: input.error.issues[0]?.message, status: "error" };
  }

  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return {
      message: "Choose an organization before sending a message.",
      status: "error",
    };
  }

  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) {
    return {
      message: "Your organization access is no longer active.",
      status: "error",
    };
  }

  const [worker, conversation] = await Promise.all([
    getWorker(organizationId, input.data.workerId),
    getConversation(
      organizationId,
      input.data.workerId,
      input.data.conversationId,
    ),
  ]);
  if (!worker || !conversation || worker.modelId !== "kilo/kilo-auto/free") {
    return { message: "This conversation is unavailable.", status: "error" };
  }

  try {
    await sendConversationMessage({
      organizationId,
      worker: {
        id: worker.id,
        instructions: worker.instructions,
        modelId: "kilo/kilo-auto/free",
      },
      conversationId: conversation.id,
      message: input.data.message,
    });
  } catch (error) {
    revalidatePath(
      `/workspace/workers/${input.data.workerId}/conversations/${input.data.conversationId}`,
    );
    revalidatePath("/workspace");
    revalidatePath("/workspace/chats");
    if (error instanceof PilotAiRuntimeError) {
      return {
        message: error.message,
        status: "error",
      };
    }

    return {
      message: "Pilot could not complete this message. Try again.",
      status: "error",
    };
  }

  revalidatePath(
    `/workspace/workers/${input.data.workerId}/conversations/${input.data.conversationId}`,
  );
  return { status: "success" };
}
