import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { ArrowLeft, Bot } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listConversations } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getWorker } from "@/workers/worker-repository";
import { startConversationAction } from "./conversations/actions";

export const metadata: Metadata = { title: "Agent" };

const workerIdSchema = z.uuid();

type WorkerPageProps = {
  params: Promise<{ workerId: string }>;
};

export default async function WorkerPage({ params }: WorkerPageProps) {
  const { workerId } = await params;
  if (!workerIdSchema.safeParse(workerId).success) notFound();
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

  const [worker, conversationList] = await Promise.all([
    getWorker(organizationId, workerId),
    listConversations(organizationId, workerId),
  ]);
  if (!worker) notFound();
  const startConversation = startConversationAction.bind(null, worker.id);

  return (
    <main className="mx-auto min-h-svh max-w-4xl space-y-8 px-6 py-8 sm:px-12">
      <Link
        href="/workspace"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Agent fleet
      </Link>
      <header className="flex items-start gap-4 border-b border-border pb-8">
        <Bot aria-hidden="true" className="mt-1 size-6 text-primary" />
        <div className="space-y-2">
          <p className="text-xs tracking-widest text-primary">AGENT</p>
          <h1 className="text-3xl font-medium tracking-tight">{worker.name}</h1>
          <p className="text-sm text-muted-foreground">{worker.modelId}</p>
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {worker.instructions}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conversations belong to this organization and agent. Tool use,
              attachments, live execution traces, and approvals are the next
              runtime slice.
            </p>
            <form action={startConversation}>
              <Button type="submit">Start conversation</Button>
            </form>
            {conversationList.length > 0 ? (
              <ul className="space-y-3" aria-label="Agent conversations">
                {conversationList.map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      href={`/workspace/workers/${worker.id}/conversations/${conversation.id}`}
                      className="text-sm underline underline-offset-4 hover:text-primary"
                    >
                      {conversation.title ?? "New conversation"}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
