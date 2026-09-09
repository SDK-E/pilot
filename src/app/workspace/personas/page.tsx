import Link from "next/link";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { Bot } from "lucide-react";
import { AgentCreationForm } from "@/components/workers/worker-creation-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { listWorkers } from "@/workers/worker-repository";
import { DeletePersonaButton } from "@/components/workers/delete-persona-button";
import { DuplicatePersonaButton } from "@/components/workers/duplicate-persona-button";

export default async function PersonasPage() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    redirect("/workspace");
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) redirect("/workspace");
  const personas = await listWorkers(organizationId);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
      <header>
        <p className="text-sm text-muted-foreground">
          {membership.organizationName}
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Personas</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Create a configured instance of a base agent. Configuration is
          organization-scoped; tool preferences never grant runtime
          capabilities.
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Create persona</CardTitle>
            <CardDescription>
              Choose a base agent and define its instructions, goals, output,
              and tool policy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentCreationForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Configured personas</CardTitle>
            <CardDescription>
              {personas.length === 0
                ? "No personas have been configured."
                : `${personas.length} configured persona${personas.length === 1 ? "" : "s"}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {personas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create the first persona to make it available to your
                organization.
              </p>
            ) : (
              <ul className="space-y-3">
                {personas.map((persona) => (
                  <li key={persona.id}>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/workspace/personas/${persona.id}`}
                        className="flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40"
                      >
                        <Bot className="mt-0.5 size-4 text-primary" />
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {persona.name}
                          </span>
                          <span className="block text-xs capitalize text-primary">
                            {persona.baseAgentId}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-sm text-muted-foreground">
                            {persona.instructions}
                          </span>
                        </span>
                      </Link>
                      <DeletePersonaButton
                        workerId={persona.id}
                        name={persona.name}
                      />
                      <DuplicatePersonaButton
                        workerId={persona.id}
                        name={persona.name}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
