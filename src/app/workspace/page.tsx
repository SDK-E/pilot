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
import { AgentCreationForm } from "@/components/workers/worker-creation-form";
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
  const agentList = current ? await listWorkers(current.organizationId) : [];

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
            ? "Create a persistent agent for this organization. Execution is introduced in the next slice."
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
              <CardTitle>Create an agent</CardTitle>
              <CardDescription>
                Pilot stores an agent as an organizational entity. Its persona,
                model, and instructions are configuration; no model is called
                yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentCreationForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Agents</CardTitle>
              <CardDescription>
                {agentList.length === 0
                  ? "No agents have been created for this organization."
                  : `${agentList.length} configured agent${agentList.length === 1 ? "" : "s"}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agentList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create the first agent with a name, a model ID, and explicit
                  instructions.
                </p>
              ) : (
                <ul className="space-y-4" aria-label="Configured agents">
                  {agentList.map((agent) => (
                    <li
                      key={agent.id}
                      className="space-y-1 border-b border-border pb-4 last:border-0 last:pb-0"
                    >
                      <p className="font-medium">{agent.name}</p>
                      <Link
                        href={`/workspace/workers/${agent.id}`}
                        className="text-sm underline underline-offset-4 hover:text-primary"
                      >
                        View configuration
                      </Link>
                      <p className="text-xs text-primary">{agent.modelId}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {agent.instructions}
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
