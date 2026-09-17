import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { ComposerPreferencesProvider } from "@/components/conversations/composer-preferences";
import { WorkspaceHeaderSlotProvider } from "@/components/workspace/workspace-header-slot";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { listConversations } from "@/conversations/conversation-repository";
import { listLocalWorkspacesForUser } from "@/organizations/local-workspace";
import { listUserOrganizations } from "@/organizations/user-organizations";
import {
  getWorkspaceSession,
  isWorkspaceSession,
} from "@/organizations/workspace-session";
import { getPlatformAdminRole } from "@/platform/platform-admin-repository";
import { getUserPreferences } from "@/users/user-preference-repository";

const RECENT_CONVERSATIONS = 50;

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");
  const session = await getWorkspaceSession();
  const organizationId = isWorkspaceSession(session)
    ? session.organizationId
    : undefined;

  const [
    preferences,
    workosOrganizations,
    localWorkspaces,
    recentConversations,
    platformAdminRole,
  ] = await Promise.all([
    getUserPreferences(user.id),
    listUserOrganizations(user.id),
    listLocalWorkspacesForUser(user.id),
    organizationId
      ? listConversations({ organizationId, userId: user.id })
      : Promise.resolve([]),
    getPlatformAdminRole(user.id),
  ]);
  const organizations = [
    ...workosOrganizations,
    ...localWorkspaces.map((workspace) => ({
      id: workspace.organizationId,
      name: workspace.organizationName,
    })),
  ];

  return (
    <ComposerPreferencesProvider
      sendMessageShortcut={preferences.sendMessageShortcut}
    >
      <WorkspaceHeaderSlotProvider>
        <WorkspaceShell
          activeOrganizationId={organizationId}
          isPlatformAdmin={Boolean(platformAdminRole)}
          organizations={organizations}
          recentConversations={recentConversations
            .slice(0, RECENT_CONVERSATIONS)
            .map((conversation) => ({
              id: conversation.id,
              kind: conversation.kind,
              title: conversation.title,
              agentName: conversation.agentName,
              preview: conversation.latestMessagePreview,
              updatedAt: conversation.updatedAt.toISOString(),
            }))}
          user={{ email: user.email, name: user.firstName }}
        >
          {children}
        </WorkspaceShell>
      </WorkspaceHeaderSlotProvider>
    </ComposerPreferencesProvider>
  );
}
