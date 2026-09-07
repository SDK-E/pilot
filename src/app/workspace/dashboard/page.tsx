import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { Bot, Gauge, MessageSquareMore, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationConversationMetrics } from "@/conversations/conversation-repository";
import { getOrganizationExecutionMetrics } from "@/executions/execution-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

export default async function DashboardPage() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    redirect("/workspace");
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) redirect("/workspace");
  const [metrics, executionMetrics] = await Promise.all([
    getOrganizationConversationMetrics(organizationId),
    getOrganizationExecutionMetrics(organizationId),
  ]);
  const cards = [
    { label: "Active agents", value: metrics.agents, icon: Bot },
    {
      label: "Running tasks",
      value: executionMetrics.running,
      icon: MessageSquareMore,
    },
    {
      label: "Completed responses",
      value: metrics.completedResponses,
      icon: Sparkles,
    },
    {
      label: "Tokens recorded",
      value: metrics.totalTokens.toLocaleString(),
      icon: Gauge,
    },
  ];
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
      <header>
        <p className="text-sm text-muted-foreground">
          {membership.organizationName}
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Usage and activity derived from persisted conversations.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <Icon className="size-4 text-primary" />
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-medium">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
