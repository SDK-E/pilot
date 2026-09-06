import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversation } from "@/conversations/conversation-repository";
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

  const [worker, conversation] = await Promise.all([
    getWorker(organizationId, workerId),
    getConversation(organizationId, workerId, conversationId),
  ]);
  if (!worker || !conversation) notFound();

  return (
    <main className="mx-auto min-h-svh max-w-4xl space-y-8 px-6 py-8 sm:px-12">
      <Link
        href={`/workspace/workers/${worker.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {worker.name}
      </Link>
      <header className="flex items-start gap-4 border-b border-border pb-8">
        <MessageSquare
          aria-hidden="true"
          className="mt-1 size-6 text-primary"
        />
        <div className="space-y-2">
          <p className="text-xs tracking-widest text-primary">CONVERSATION</p>
          <h1 className="text-3xl font-medium tracking-tight">
            {conversation.title ?? "New conversation"}
          </h1>
          <p className="text-sm text-muted-foreground">{worker.name}</p>
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Messaging is not enabled yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Pilot has created this organization-scoped conversation and reserved
            its ID for the Mastra memory thread. Messages will remain
            unavailable until the Neon-backed runtime, tenant authorization, and
            durable execution boundary are verified.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
