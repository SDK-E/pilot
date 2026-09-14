import "server-only";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { getActiveOrganizationMembership } from "./active-membership";

const ORGANIZATION_ID = /^org_[a-zA-Z0-9]+$/;

export interface WorkspaceSession {
  user: { id: string; email: string; name?: string | null };
  organizationId: string;
  membership: NonNullable<
    Awaited<ReturnType<typeof getActiveOrganizationMembership>>
  >;
}

export type SessionFailure = "signed-out" | "no-organization" | "not-a-member";

/**
 * The signed-in user with an active membership in the selected organization,
 * or the reason there is none. Every workspace page, action, and API route
 * starts here so authorization is checked the same way everywhere.
 */
export async function getWorkspaceSession(): Promise<
  WorkspaceSession | SessionFailure
> {
  const { user, organizationId } = await withAuth();
  if (!user) return "signed-out";
  if (!organizationId || !ORGANIZATION_ID.test(organizationId)) {
    return "no-organization";
  }
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) return "not-a-member";
  return {
    user: { id: user.id, email: user.email, name: user.firstName },
    organizationId,
    membership,
  };
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
  redirect(session === "signed-out" ? "/sign-in" : "/chat");
}

const FAILURE_MESSAGES: Record<SessionFailure, string> = {
  "signed-out": "Sign in to continue.",
  "no-organization": "Choose an organization first.",
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
