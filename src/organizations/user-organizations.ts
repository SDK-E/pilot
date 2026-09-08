import "server-only";

import { getWorkOS } from "@workos-inc/authkit-nextjs";

export type UserOrganization = {
  id: string;
  name: string;
};

export async function listUserOrganizations(userId: string) {
  const organizations: UserOrganization[] = [];
  let after: string | undefined;

  do {
    const page = await getWorkOS().userManagement.listOrganizationMemberships({
      userId,
      statuses: ["active"],
      limit: 100,
      after,
    });
    organizations.push(
      ...page.data.map((membership) => ({
        id: membership.organizationId,
        name: membership.organizationName,
      })),
    );
    after = page.listMetadata.after ?? undefined;
  } while (after);

  return organizations;
}
