import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { ArrowUpRight, MessageSquareMore, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  isResearchAvailable,
  getResearchState,
  getResearchDisabledTooltip,
} from "@/conversations/research-availability";
import { NewChatForm } from "@/components/conversations/new-chat-form";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { listWorkers } from "@/workers/worker-repository";
import { Button } from "@/components/ui/button";

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
  const mode = resolvedSearchParams?.mode;
  const researchState = getResearchState(agents);

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
          agents={agents
            .filter((agent) => isResearchAvailable(agent.baseAgentId))
            .map((agent) => ({
              id: agent.id,
              name: agent.name,
              baseAgentId: agent.baseAgentId,
            }))}
          defaultAgentId={organizationPreferences.defaultWorkerId}
          mode={mode}
        />
        <div className="grid gap-3 text-left grid-cols-responsive">
          {[
            {
              title: "Plan",
              description: "Turn an idea into clear steps",
              icon: Sparkles,
              href: "/workspace?mode=plan",
            },
            {
              title: "Draft",
              description: "Write and refine a first version",
              icon: MessageSquareMore,
              href: "/workspace?mode=draft",
            },
            {
              title: "Research",
              description: "Search the public web with cited sources",
              icon: ArrowUpRight,
              href: "/workspace?mode=research",
              disabled: researchState !== "available",
              disabledTooltip: getResearchDisabledTooltip(researchState),
            },
          ].map((item) => {
            const IconComponent = item.icon;
            const isResearchDisabled =
              item.title === "Research" && item.disabled;
            if (isResearchDisabled) {
              return (
                <Button
                  key={item.title}
                  aria-disabled={true}
                  className="h-auto justify-start rounded-xl border border-border bg-card/45 p-4 text-left opacity-70"
                  disabled
                  title={item.disabledTooltip}
                  variant="outline"
                >
                  <IconComponent
                    className="mb-3 size-4 text-primary"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </Button>
              );
            }
            return (
              <Button
                key={item.title}
                asChild
                className="h-auto justify-start rounded-xl border border-border bg-card/45 p-4 text-left"
                variant="outline"
              >
                <Link href={item.href}>
                  <IconComponent
                    className="mb-3 size-4 text-primary"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </Link>
              </Button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
