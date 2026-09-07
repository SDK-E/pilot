import { AgentFleetShell } from "@/components/agents/agent-fleet-sidebar";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { listRecentOrganizationConversations } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

export default async function WorkspaceLayout({
  children,
}: LayoutProps<"/workspace">) {
  const { user, organizationId } = await withAuth();
  const hasOrganization = Boolean(
    organizationId && /^org_[a-zA-Z0-9]+$/.test(organizationId),
  );
  const membership =
    user && hasOrganization
      ? await getActiveOrganizationMembership(user.id, organizationId!)
      : undefined;
  const recentChats = membership
    ? await listRecentOrganizationConversations(organizationId!, user?.id ?? "")
    : [];

  return (
    <AgentFleetShell recentChats={recentChats}>{children}</AgentFleetShell>
  );
}
