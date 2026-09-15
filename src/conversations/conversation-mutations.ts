import "server-only";

import { truncateConversationMemory } from "@/ai/pilot-ai-client";
import { deleteMessagesFrom } from "@/conversations/conversation-message-repository";
import { getProjectMemoryContextForConversation } from "@/projects/project-repository";

/**
 * The shared half of edit and regenerate: forgets everything at or after
 * `cutoff` from both Pilot's own history and the runtime's memory of the
 * conversation, so the turn about to be resent does not collide with, or
 * get contaminated by, what it is replacing. Postgres is truncated after the
 * runtime call succeeds — if the runtime call fails, nothing is destroyed
 * and the caller's error simply reaches the user as a normal failed request.
 */
export async function forgetMessagesFrom(
  input: { organizationId: string; userId: string; agentId: string },
  conversationId: string,
  cutoff: Date,
): Promise<void> {
  const project = await getProjectMemoryContextForConversation({
    organizationId: input.organizationId,
    userId: input.userId,
    conversationId,
  });
  await truncateConversationMemory({
    organizationId: input.organizationId,
    workerId: input.agentId,
    conversationId,
    project: project && {
      id: project.id,
      sharedMemoryEnabled: project.sharedMemoryEnabled,
    },
    cutoff,
  });
  await deleteMessagesFrom(
    { organizationId: input.organizationId, userId: input.userId },
    conversationId,
    cutoff,
  );
}
