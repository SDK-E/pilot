import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { ConversationShell } from "@/components/conversations/conversation-shell";
import {
  getConversation,
  listConversationMessages,
} from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getWorker } from "@/workers/worker-repository";

export const metadata: Metadata = { title: "Conversation" };

const conversationIdSchema = z.uuid();
const workerIdSchema = z.uuid();

type ConversationPageProps = {
  params: Promise<{ conversationId: string; workerId: string }>;
};

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { conversationId, workerId } = await params;
  if (
    !conversationIdSchema.safeParse(conversationId).success ||
    !workerIdSchema.safeParse(workerId).success
  ) {
    notFound();
  }
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    redirect("/workspace");
  }

  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) notFound();

  const [worker, conversation, messages] = await Promise.all([
    getWorker(organizationId, workerId),
    getConversation(organizationId, workerId, conversationId),
    listConversationMessages(organizationId, workerId, conversationId),
  ]);
  if (!worker || !conversation || !messages) notFound();

  const isRuntimeConfigured = Boolean(process.env.PILOT_AI_RUNTIME_URL?.trim());

  return (
    <ConversationShell
      backHref={`/workspace/workers/${worker.id}`}
      conversationId={conversation.id}
      messages={messages}
      runtimeConfigured={isRuntimeConfigured}
      title={conversation.title ?? "New conversation"}
      agentId={worker.id}
      agentName={worker.name}
    />
  );
}
