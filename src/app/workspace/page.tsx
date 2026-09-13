import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { Sparkles } from "lucide-react";
import { isResearchAvailable } from "@/conversations/research-availability";
import { NewChatForm } from "@/components/conversations/new-chat-form";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { listWorkers } from "@/workers/worker-repository";

export default async function WorkspaceHome({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");

  const membership =
    organizationId && /^org_[a-zA-Z0-9]+$/.test(organizationId)
      ? await getActiveOrganizationMembership(user.id, organizationId)
      : undefined;
  const [agents, organizationPreferences, resolvedSearchParams] =
    membership && organizationId
      ? await Promise.all([
          listWorkers(organizationId),
          getOrganizationPreferences(organizationId),
          searchParams,
        ])
      : [[], { defaultWorkerId: null }, { mode: undefined }];

  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-1 items-center px-5 py-10 sm:px-8 lg:py-14">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            Your AI workspace
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
            What can Pilot help you accomplish?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            Start a new conversation, choose the right agent, and keep every
            result, file, and approval together in your workspace.
          </p>
        </div>
        <NewChatForm
          agents={agents
            .filter((agent) => isResearchAvailable(agent.baseAgentId))
            .map((agent) => ({
              id: agent.id,
              name: agent.name,
              baseAgentId: agent.baseAgentId,
            }))}
          defaultAgentId={organizationPreferences.defaultWorkerId}
          mode={resolvedSearchParams.mode}
        />
      </section>
    </main>
  );
}
