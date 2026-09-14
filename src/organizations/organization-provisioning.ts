import "server-only";

import { getWorkOS } from "@workos-inc/authkit-nextjs";

/**
 * A one-time Admin Portal link an organization owner/admin can use to verify
 * their company's email domain. Once verified, WorkOS's just-in-time
 * provisioning adds new sign-ups with a matching domain as members
 * automatically, without an invite.
 */
export async function generateDomainVerificationLink(
  organizationId: string,
): Promise<string> {
  const { link } = await getWorkOS().adminPortal.generateLink({
    intent: "domain_verification",
    organization: organizationId,
  });
  return link;
}
