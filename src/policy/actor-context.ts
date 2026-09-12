import "server-only";

import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { db } from "@/db/client";
import { members } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type ActorScope =
  | "conversation:read"
  | "conversation:write"
  | "project:read"
  | "project:write"
  | "approval:read"
  | "approval:decide"
  | "execution:run"
  | "admin:organization";

export type ActorContext = {
  organizationId: string;
  workosUserId: string;
  membership: Awaited<ReturnType<typeof getActiveOrganizationMembership>>;
  roles: string[];
  scope: ActorScope[];
  policyVersion: "02";
};

export async function resolveActorContext(input: {
  user: { id: string };
  organizationId: string;
}): Promise<ActorContext> {
  const membership = await getActiveOrganizationMembership(
    input.user.id,
    input.organizationId,
  );

  let roles: string[] = [];
  if (membership) {
    const [memberRecords] = await db
      .select({ roleSlug: members.roleSlug })
      .from(members)
      .where(
        and(
          eq(members.organizationId, input.organizationId),
          eq(members.workosUserId, input.user.id),
        ),
      );
    if (memberRecords) {
      roles = [memberRecords.roleSlug];
    }
  }

  const scope: ActorScope[] = [];
  if (membership) {
    scope.push(
      "conversation:read",
      "conversation:write",
      "project:read",
      "project:write",
      "execution:run",
    );
    if (roles.some((r) => r === "owner" || r === "admin")) {
      scope.push("approval:decide", "admin:organization");
    }
    scope.push("approval:read");
  }

  return {
    organizationId: input.organizationId,
    workosUserId: input.user.id,
    membership,
    roles,
    scope,
    policyVersion: "02",
  };
}
