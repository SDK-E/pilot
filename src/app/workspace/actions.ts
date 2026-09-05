"use server";

import {
  getWorkOS,
  switchToOrganization,
  withAuth,
} from "@workos-inc/authkit-nextjs";

export async function selectOrganization(formData: FormData) {
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

  await switchToOrganization(organizationId, { returnTo: "/workspace" });
}
