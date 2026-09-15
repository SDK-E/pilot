import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { firstRow } from "@/db/first-row";
import { members, organizationDomains, organizations } from "@/db/schema";

export interface LocalWorkspace {
  organizationId: string;
  organizationName: string;
  membership: { id: string; roleSlug: string };
}

/**
 * Creates a brand-new local-only workspace and adds the given user as its
 * owner. Never registered with WorkOS — this is Pilot's own database, for
 * anyone without an SDK Enterprises membership.
 */
export async function createLocalOrganization(input: {
  name: string;
  owner: { id: string; email: string };
}): Promise<LocalWorkspace> {
  const organizationId = `local_${randomUUID()}`;
  const membershipId = `local_${randomUUID()}`;
  await db.batch([
    db.insert(organizations).values({
      id: organizationId,
      name: input.name,
      source: "local",
    }),
    db.insert(members).values({
      organizationId,
      workosUserId: input.owner.id,
      workosMembershipId: membershipId,
      email: input.owner.email,
      roleSlug: "owner",
    }),
  ]);
  return {
    organizationId,
    organizationName: input.name,
    membership: { id: membershipId, roleSlug: "owner" },
  };
}

function toLocalWorkspace(row: {
  organizationId: string;
  organizationName: string;
  membershipId: string;
  roleSlug: string;
}): LocalWorkspace {
  return {
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    membership: { id: row.membershipId, roleSlug: row.roleSlug },
  };
}

/**
 * Every local workspace the signed-in user belongs to: ones they created
 * themselves, plus any they auto-joined by a verified domain match. A user
 * can belong to more than one and switch between them.
 */
export async function listLocalWorkspacesForUser(
  userId: string,
): Promise<LocalWorkspace[]> {
  const rows = await db
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      membershipId: members.workosMembershipId,
      roleSlug: members.roleSlug,
    })
    .from(members)
    .innerJoin(organizations, eq(organizations.id, members.organizationId))
    .where(
      and(eq(members.workosUserId, userId), eq(organizations.source, "local")),
    );
  return rows.map((row) => toLocalWorkspace(row));
}

/**
 * A specific local workspace, only if the given user is actually a member —
 * used to validate an explicit switch before trusting it.
 */
export async function getLocalMembership(
  userId: string,
  organizationId: string,
): Promise<LocalWorkspace | null> {
  const [row] = await db
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      membershipId: members.workosMembershipId,
      roleSlug: members.roleSlug,
    })
    .from(members)
    .innerJoin(organizations, eq(organizations.id, members.organizationId))
    .where(
      and(
        eq(members.workosUserId, userId),
        eq(organizations.id, organizationId),
        eq(organizations.source, "local"),
      ),
    )
    .limit(1);
  return row ? toLocalWorkspace(row) : null;
}

/**
 * Finds the local organization whose verified domain matches the given
 * email, if any. Pilot's own equivalent of WorkOS just-in-time provisioning.
 */
export async function findOrganizationByVerifiedDomain(
  email: string,
): Promise<{ organizationId: string; organizationName: string } | null> {
  const domain = email.split("@", 2)[1]?.toLowerCase();
  if (!domain) return null;
  const [row] = await db
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
    })
    .from(organizationDomains)
    .innerJoin(
      organizations,
      eq(organizations.id, organizationDomains.organizationId),
    )
    .where(
      and(
        eq(organizationDomains.domain, domain),
        eq(organizationDomains.status, "verified"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Renames a local workspace.
 */
export async function renameLocalOrganization(
  organizationId: string,
  name: string,
): Promise<void> {
  await db
    .update(organizations)
    .set({ name, updatedAt: new Date() })
    .where(
      and(
        eq(organizations.id, organizationId),
        eq(organizations.source, "local"),
      ),
    );
}

/**
 * Permanently deletes a local workspace and everything scoped to it —
 * members, agents, projects, conversations, executions, and any domain
 * claims. Every one of those tables has an `ON DELETE CASCADE` foreign key
 * to `organizations.id`, so removing the organization row is enough at the
 * database layer. Never touches WorkOS.
 */
export async function deleteLocalOrganization(
  organizationId: string,
): Promise<string | null> {
  const rows = await db
    .delete(organizations)
    .where(
      and(
        eq(organizations.id, organizationId),
        eq(organizations.source, "local"),
      ),
    )
    .returning({ id: organizations.id });
  return rows[0]?.id ?? null;
}

/**
 * Adds the given user as a member of a local organization matched by
 * verified domain. Idempotent, so a concurrent duplicate sign-in resolves to
 * the same membership rather than erroring.
 */
export async function joinLocalOrganization(input: {
  organizationId: string;
  user: { id: string; email: string };
}): Promise<{ id: string; roleSlug: string }> {
  const membershipId = `local_${randomUUID()}`;
  const rows = await db
    .insert(members)
    .values({
      organizationId: input.organizationId,
      workosUserId: input.user.id,
      workosMembershipId: membershipId,
      email: input.user.email,
      roleSlug: "member",
    })
    .onConflictDoUpdate({
      target: [members.organizationId, members.workosUserId],
      set: { email: input.user.email, updatedAt: new Date() },
    })
    .returning({ id: members.workosMembershipId, roleSlug: members.roleSlug });
  return firstRow(rows);
}
