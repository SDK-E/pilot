import { notFound, redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { AgentCreationForm } from "@/components/workers/worker-creation-form";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getWorker } from "@/workers/worker-repository";

export default async function PersonaPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  if (!z.uuid().safeParse(workerId).success) notFound();
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    redirect("/workspace");
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    notFound();
  const persona = await getWorker(organizationId, workerId);
  if (!persona) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <header>
        <p className="text-sm text-muted-foreground">Persona</p>
        <h1 className="text-3xl font-medium tracking-tight">
          Edit {persona.name}
        </h1>
      </header>
      <AgentCreationForm persona={persona} />
    </main>
  );
}
