import "server-only";

import { getWorkOS } from "@workos-inc/authkit-nextjs";

export async function getActiveOrganizationMembership(
  userId: string,
  organizationId: string,
) {
  const memberships =
    await getWorkOS().userManagement.listOrganizationMemberships({
      userId,
      organizationId,
      statuses: ["active"],
      limit: 1,
    });

  return memberships.data[0];
}
