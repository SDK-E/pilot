import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { platformAdmins } from "@/db/schema";

export type PlatformAdminRole = "superadmin" | "admin";

export async function getPlatformAdminRole(
  workosUserId: string,
): Promise<PlatformAdminRole | undefined> {
  const [row] = await db
    .select({ role: platformAdmins.role })
    .from(platformAdmins)
    .where(eq(platformAdmins.workosUserId, workosUserId))
    .limit(1);
  return row?.role;
}

export function listPlatformAdmins() {
  return db
    .select({
      id: platformAdmins.id,
      workosUserId: platformAdmins.workosUserId,
      email: platformAdmins.email,
      role: platformAdmins.role,
      createdAt: platformAdmins.createdAt,
    })
    .from(platformAdmins)
    .orderBy(platformAdmins.createdAt);
}

export async function addPlatformAdmin(input: {
  workosUserId: string;
  email: string;
  role: PlatformAdminRole;
  addedByWorkosUserId: string;
}) {
  const [created] = await db
    .insert(platformAdmins)
    .values(input)
    .onConflictDoUpdate({
      target: platformAdmins.workosUserId,
      set: { role: input.role, email: input.email },
    })
    .returning({ id: platformAdmins.id, email: platformAdmins.email });
  return created;
}

/**
 * Refuses to remove the last superadmin — otherwise the platform's admin
 * panel could lock every admin out with no way back in short of a manual
 * database edit.
 */
export async function removePlatformAdmin(
  workosUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const all = await listPlatformAdmins();
  const target = all.find((admin) => admin.workosUserId === workosUserId);
  if (!target) return { ok: false, error: "This admin is unavailable." };
  const superadmins = all.filter((admin) => admin.role === "superadmin");
  if (target.role === "superadmin" && superadmins.length <= 1) {
    return { ok: false, error: "At least one superadmin must remain." };
  }
  await db
    .delete(platformAdmins)
    .where(eq(platformAdmins.workosUserId, workosUserId));
  return { ok: true };
}
