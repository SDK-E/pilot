import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { ArrowUpRight, MessageSquareMore, Sparkles } from "lucide-react";
import { NewChatForm } from "@/components/conversations/new-chat-form";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { listWorkers } from "@/workers/worker-repository";

export default async function WorkspaceHome() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  const membership =
    organizationId && /^org_[a-zA-Z0-9]+$/.test(organizationId)
      ? await getActiveOrganizationMembership(user.id, organizationId)
      : undefined;
  const [agents, organizationPreferences] = membership
    ? await Promise.all([
        listWorkers(organizationId!),
        getOrganizationPreferences(organizationId!),
      ])
    : [[], { defaultWorkerId: null }];

  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
      <section className="w-full max-w-3xl space-y-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary shadow-sm shadow-primary/10">
          <MessageSquareMore aria-hidden="true" className="size-6" />
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {organizationId ? "Your workspace" : "Pilot"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            What are we working on?
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Start a focused conversation with Pilot. Your chat is saved to this
            organization after you send the first message.
          </p>
        </div>
        <NewChatForm
          agents={agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            baseAgentId: agent.baseAgentId,
          }))}
          defaultAgentId={organizationPreferences.defaultWorkerId}
        />
        <div className="grid gap-3 text-left sm:grid-cols-3">
          {[
            ["Plan", "Turn an idea into clear steps", Sparkles],
            ["Draft", "Write and refine a first version", MessageSquareMore],
            [
              "Research",
              "Search the public web with cited sources",
              ArrowUpRight,
            ],
          ].map(([title, description, Icon]) => {
            const IconComponent = Icon as typeof Sparkles;
            return (
              <div
                key={title as string}
                className="rounded-xl border border-border bg-card/45 p-4"
              >
                <IconComponent
                  className="mb-3 size-4 text-primary"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">{title as string}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {description as string}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
