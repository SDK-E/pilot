import { AgentFleetShell } from "@/components/agents/agent-fleet-sidebar";
import { ComposerPreferencesProvider } from "@/components/conversations/composer-preferences";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { listRecentOrganizationConversations } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { listUserOrganizations } from "@/organizations/user-organizations";
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
  const organizationsPromise = user
    ? listUserOrganizations(user.id)
    : Promise.resolve([]);
  const [membership, preferences, organizations] = await Promise.all([
    membershipPromise,
    preferencesPromise,
    organizationsPromise,
  ]);
  const recentChats = membership
    ? (
        await listRecentOrganizationConversations(
          organizationId!,
          user?.id ?? "",
          50,
        )
      ).map((chat) => ({
        ...chat,
        updatedLabel: new Intl.DateTimeFormat("en", {
          day: "numeric",
          month: "short",
        }).format(chat.updatedAt),
      }))
    : [];

  return (
    <ComposerPreferencesProvider
      sendMessageShortcut={preferences?.sendMessageShortcut ?? "mod_enter"}
    >
      <AgentFleetShell
        activeOrganizationId={organizationId}
        organizations={organizations}
        recentChats={recentChats}
        user={user ? { email: user.email, name: user.name } : undefined}
        uiLocale={preferences?.uiLocale ?? null}
      >
        {children}
      </AgentFleetShell>
    </ComposerPreferencesProvider>
  );
}
