import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOutAction } from "@/app/auth/actions";
import { WorkerCreationForm } from "@/components/workers/worker-creation-form";
import { listWorkers } from "@/workers/worker-repository";
import { selectOrganization } from "./actions";

export const metadata: Metadata = { title: "Workspace" };

export default async function Workspace() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  const memberships =
    await getWorkOS().userManagement.listOrganizationMemberships({
      userId: user.id,
      statuses: ["active"],
    });
  const organizations = await memberships.autoPagination();
  const current = organizations.find(
    (membership) => membership.organizationId === organizationId,
  );
  const workerList = current ? await listWorkers(current.organizationId) : [];

  return (
    <main className="mx-auto min-h-svh max-w-5xl space-y-12 px-6 py-8 sm:px-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <Link href="/" className="text-xl font-semibold">
          Pilot<span className="text-primary">_</span>
        </Link>
        <form action={signOutAction}>
          <Button variant="outline">Sign out</Button>
        </form>
      </header>
      <section className="space-y-4">
        <p className="break-all text-sm text-muted-foreground">{user.email}</p>
        <h1 className="text-3xl font-medium tracking-tight">
          {current ? current.organizationName : "Choose your organization"}
        </h1>
        <p className="max-w-2xl leading-relaxed text-muted-foreground">
          {current
            ? "Create and configure the first persistent worker for this organization. Execution is introduced in the next slice."
            : "Open an organization to continue to its workspace."}
        </p>
      </section>
      {organizations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No organization access yet</CardTitle>
            <CardDescription>
              Ask your organization administrator to add you, then return here.
              An active membership is required to access a workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href="/workspace">Check access again</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section
          aria-label="Your organizations"
          className="grid gap-4 sm:grid-cols-2"
        >
          {organizations.map((membership) => (
            <Card key={membership.id}>
              <CardHeader>
                <Building2
                  className="mb-4 size-5 text-primary"
                  aria-hidden="true"
                />
                <CardTitle>{membership.organizationName}</CardTitle>
                <CardDescription>{membership.role.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                {current?.id === membership.id ? (
                  <p className="text-sm text-primary">Current workspace</p>
                ) : (
                  <form action={selectOrganization}>
                    <input
                      type="hidden"
                      name="organizationId"
                      value={membership.organizationId}
                    />
                    <Button type="submit" variant="secondary">
                      Open {membership.organizationName}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
      {current ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Create a worker</CardTitle>
              <CardDescription>
                Pilot stores a worker as an organizational entity. Its model and
                instructions are configuration; no model is called yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkerCreationForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Workers</CardTitle>
              <CardDescription>
                {workerList.length === 0
                  ? "No workers have been created for this organization."
                  : `${workerList.length} configured worker${workerList.length === 1 ? "" : "s"}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workerList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create the first worker with a name, a model ID, and explicit
                  instructions.
                </p>
              ) : (
                <ul className="space-y-4" aria-label="Configured workers">
                  {workerList.map((worker) => (
                    <li
                      key={worker.id}
                      className="space-y-1 border-b border-border pb-4 last:border-0 last:pb-0"
                    >
                      <p className="font-medium">{worker.name}</p>
                      <Link
                        href={`/workspace/workers/${worker.id}`}
                        className="text-sm underline underline-offset-4 hover:text-primary"
                      >
                        View configuration
                      </Link>
                      <p className="text-xs text-primary">{worker.modelId}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {worker.instructions}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
