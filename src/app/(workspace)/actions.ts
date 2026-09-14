"use server";

import {
  getWorkOS,
  switchToOrganization,
  withAuth,
} from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getLocalMembership } from "@/organizations/local-workspace";
import { LOCAL_ORGANIZATION_COOKIE } from "@/organizations/workspace-session";

export async function selectOrganizationAction(formData: FormData) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const organizationId = formData.get("organizationId");
  if (
    typeof organizationId !== "string" ||
    !/^org_[a-zA-Z0-9]+$/.test(organizationId)
  ) {
    throw new Error("Invalid organization.");
  }

  const memberships =
    await getWorkOS().userManagement.listOrganizationMemberships({
      userId: user.id,
      organizationId,
      statuses: ["active"],
      limit: 1,
    });
  if (memberships.data.length === 0) {
    throw new Error("Organization access is unavailable.");
  }

  // The local-workspace cookie takes priority in session resolution, so it
  // has to be cleared here or this WorkOS switch would have no effect.
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_ORGANIZATION_COOKIE);
  await switchToOrganization(organizationId, { returnTo: "/chat" });
}

/**
 * Switches the active local workspace. WorkOS's session cookie can't hold a
 * local org id, so this writes Pilot's own cookie instead of calling
 * `switchToOrganization`.
 */
export async function selectLocalOrganizationAction(formData: FormData) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const organizationId = formData.get("organizationId");
  if (
    typeof organizationId !== "string" ||
    !/^local_[a-zA-Z0-9-]+$/.test(organizationId)
  ) {
    throw new Error("Invalid workspace.");
  }

  const membership = await getLocalMembership(user.id, organizationId);
  if (!membership) throw new Error("Workspace access is unavailable.");

  const cookieStore = await cookies();
  cookieStore.set(LOCAL_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/chat");
}
