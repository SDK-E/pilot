import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { ArrowLeft, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorker } from "@/workers/worker-repository";

export const metadata: Metadata = { title: "Worker" };

type WorkerPageProps = {
  params: Promise<{ workerId: string }>;
};

export default async function WorkerPage({ params }: WorkerPageProps) {
  const { workerId } = await params;
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    redirect("/workspace");
  }

  const memberships =
    await getWorkOS().userManagement.listOrganizationMemberships({
      userId: user.id,
      organizationId,
      statuses: ["active"],
      limit: 1,
    });
  if (memberships.data.length === 0) notFound();

  const worker = await getWorker(organizationId, workerId);
  if (!worker) notFound();

  return (
    <main className="mx-auto min-h-svh max-w-4xl space-y-8 px-6 py-8 sm:px-12">
      <Link
        href="/workspace"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Workspace
      </Link>
      <header className="flex items-start gap-4 border-b border-border pb-8">
        <Bot aria-hidden="true" className="mt-1 size-6 text-primary" />
        <div className="space-y-2">
          <p className="text-xs tracking-widest text-primary">WORKER</p>
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
          <CardTitle>Runtime status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This worker is saved and configured. Conversation, memory, tools,
            and execution are not enabled yet.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
