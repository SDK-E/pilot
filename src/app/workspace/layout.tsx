import { AgentFleetShell } from "@/components/agents/agent-fleet-sidebar";
import { ComposerPreferencesProvider } from "@/components/conversations/composer-preferences";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { listRecentOrganizationConversations } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getUserPreferences } from "@/users/user-preference-repository";

export default async function WorkspaceLayout({
  children,
}: LayoutProps<"/workspace">) {
  const { user, organizationId } = await withAuth();
  const hasOrganization = Boolean(
    organizationId && /^org_[a-zA-Z0-9]+$/.test(organizationId),
  );
  const membershipPromise =
    user && hasOrganization
      ? getActiveOrganizationMembership(user.id, organizationId!)
      : Promise.resolve(undefined);
  const preferencesPromise = user
    ? getUserPreferences(user.id)
    : Promise.resolve(undefined);
  const [membership, preferences] = await Promise.all([
    membershipPromise,
    preferencesPromise,
  ]);
  const recentChats = membership
    ? await listRecentOrganizationConversations(organizationId!, user?.id ?? "")
    : [];

  return (
    <ComposerPreferencesProvider
      sendMessageShortcut={preferences?.sendMessageShortcut ?? "mod_enter"}
    >
      <AgentFleetShell recentChats={recentChats}>{children}</AgentFleetShell>
    </ComposerPreferencesProvider>
  );
}
