import { GeneralInstructionsSection } from "@/components/settings/general-instructions-section";
import { MemorySection } from "@/components/settings/memory-section";
import { OrganizationInstructionsSection } from "@/components/settings/organization-instructions-section";
import { UserFilesSection } from "@/components/settings/user-files-section";
import { listUserFiles } from "@/files/user-file-repository";
import {
  listOrganizationMemories,
  listUserMemories,
} from "@/memory/memory-repository";
import { getGeneralInstructions } from "@/users/user-preference-repository";

import type { getOrganizationPreferences } from "@/organizations/organization-preference-repository";

/**
 * Personal memory, instructions, and knowledge-base sections — visible to
 * every member. Organization-scope instructions/memory are read-only for a
 * non-admin (their save actions reject a non-admin server-side regardless).
 */
export async function loadMemorySection(input: {
  organizationId: string;
  userId: string;
  isAdmin: boolean;
  organization: Awaited<ReturnType<typeof getOrganizationPreferences>>;
}): Promise<React.ReactNode> {
  const [organizationMemories, userMemories, userFiles, generalInstructions] =
    await Promise.all([
      listOrganizationMemories(input.organizationId),
      listUserMemories(input.organizationId, input.userId),
      listUserFiles({
        organizationId: input.organizationId,
        userId: input.userId,
      }),
      getGeneralInstructions(input.userId),
    ]);

  return (
    <>
      <GeneralInstructionsSection generalInstructions={generalInstructions} />
      <MemorySection
        description="Facts an agent is given as context in every conversation you have."
        memories={userMemories}
        scope="user"
        title="Your memory"
      />
      <UserFilesSection files={userFiles} />
      {input.isAdmin ? (
        <>
          <OrganizationInstructionsSection
            standingInstructions={input.organization.standingInstructions}
          />
          <MemorySection
            description="Facts every agent is given as context in every conversation, for every member."
            memories={organizationMemories}
            scope="organization"
            title="Organization memory"
          />
        </>
      ) : null}
    </>
  );
}
