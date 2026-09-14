import "server-only";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActiveOrganizationMembership } from "./active-membership";
import {
  findOrganizationByVerifiedDomain,
  getLocalMembership,
  joinLocalOrganization,
  listLocalWorkspacesForUser,
} from "./local-workspace";

const ORGANIZATION_ID = /^org_[a-zA-Z0-9]+$/;

/**
 * Which local workspace is active, for a user who belongs to more than one.
 * WorkOS's own session cookie can only ever hold a real WorkOS org id, so a
 * local selection needs a cookie of Pilot's own.
 */
export const LOCAL_ORGANIZATION_COOKIE = "pilot_local_org";

/**
 * The narrow membership shape every surface actually reads — satisfied by
 * both a real WorkOS `OrganizationMembership` and a synthesized local one.
 */
interface WorkspaceMembership {
  id: string;
  organizationName: string;
  role: { slug: string };
}

export interface WorkspaceSession {
  user: { id: string; email: string; name?: string | null };
  organizationId: string;
  membership: WorkspaceMembership;
  /**
   * "workos" = SDK Enterprises' own WorkOS-backed organization. "local" =
   * a workspace that exists only in Pilot's database, never in WorkOS.
   */
  kind: "workos" | "local";
}

export type SessionFailure = "signed-out" | "no-organization" | "not-a-member";

function toWorkspaceSession(
  user: { id: string; email: string; firstName?: string | null },
  organizationId: string,
  kind: WorkspaceSession["kind"],
  membership: WorkspaceMembership,
): WorkspaceSession {
  return {
    user: { id: user.id, email: user.email, name: user.firstName },
    organizationId,
    membership,
    kind,
  };
}

/**
 * The signed-in user with an active membership in the selected organization,
 * or the reason there is none. Every workspace page, action, and API route
 * starts here so authorization is checked the same way everywhere.
 *
 * Only SDK Enterprises lives in WorkOS: when WorkOS's session carries no
 * organization, the user's workspace is resolved locally instead — their
 * own local workspace if they already have one, or one they auto-join by a
 * verified domain match (Pilot's own equivalent of WorkOS JIT provisioning).
 */
export async function getWorkspaceSession(): Promise<
  WorkspaceSession | SessionFailure
> {
  const { user, organizationId } = await withAuth();
  if (!user) return "signed-out";

  // An explicit local-workspace choice (the account menu, or just having
  // created one) wins over whatever org WorkOS's own session still carries —
  // otherwise a user who also belongs to a WorkOS organization could never
  // actually switch into a local workspace.
  const cookieStore = await cookies();
  const selectedLocalId = cookieStore.get(LOCAL_ORGANIZATION_COOKIE)?.value;
  if (selectedLocalId) {
    const selected = await getLocalMembership(user.id, selectedLocalId);
    if (selected) {
      return toWorkspaceSession(user, selected.organizationId, "local", {
        id: selected.membership.id,
        organizationName: selected.organizationName,
        role: { slug: selected.membership.roleSlug },
      });
    }
    // Stale or revoked cookie — fall through to normal resolution below.
  }

  if (organizationId && ORGANIZATION_ID.test(organizationId)) {
    const membership = await getActiveOrganizationMembership(
      user.id,
      organizationId,
    );
    if (!membership) return "not-a-member";
    return toWorkspaceSession(user, organizationId, "workos", membership);
  }

  const [firstLocalWorkspace] = await listLocalWorkspacesForUser(user.id);
  if (firstLocalWorkspace) {
    return toWorkspaceSession(
      user,
      firstLocalWorkspace.organizationId,
      "local",
      {
        id: firstLocalWorkspace.membership.id,
        organizationName: firstLocalWorkspace.organizationName,
        role: { slug: firstLocalWorkspace.membership.roleSlug },
      },
    );
  }

  const domainMatch = await findOrganizationByVerifiedDomain(user.email);
  if (domainMatch) {
    const membership = await joinLocalOrganization({
      organizationId: domainMatch.organizationId,
      user: { id: user.id, email: user.email },
    });
    return toWorkspaceSession(user, domainMatch.organizationId, "local", {
      id: membership.id,
      organizationName: domainMatch.organizationName,
      role: { slug: membership.roleSlug },
    });
  }

  return "no-organization";
}

export function isWorkspaceSession(
  value: WorkspaceSession | SessionFailure,
): value is WorkspaceSession {
  return typeof value !== "string";
}

/**
 * For pages: redirects to sign-in or the workspace home when there is no
 * usable session.
 */
export async function requireWorkspaceSession(): Promise<WorkspaceSession> {
  const session = await getWorkspaceSession();
  if (isWorkspaceSession(session)) return session;
  if (session === "signed-out") redirect("/sign-in");
  else if (session === "no-organization") redirect("/onboarding");
  else redirect("/chat");
}

const FAILURE_MESSAGES: Record<SessionFailure, string> = {
  "signed-out": "Sign in to continue.",
  "no-organization": "Create or join a workspace first.",
  "not-a-member": "Your organization access is no longer active.",
};

export function sessionFailureMessage(failure: SessionFailure): string {
  return FAILURE_MESSAGES[failure];
}

/**
 * For API routes: the JSON error response for a missing session.
 */
export function sessionFailureResponse(failure: SessionFailure): Response {
  return Response.json(
    { error: FAILURE_MESSAGES[failure] },
    { status: failure === "signed-out" ? 401 : 403 },
  );
}
