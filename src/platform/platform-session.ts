import "server-only";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import {
  getPlatformAdminRole,
  type PlatformAdminRole,
} from "@/platform/platform-admin-repository";

export interface PlatformAdminSession {
  user: { id: string; email: string };
  role: PlatformAdminRole;
}

/**
 * A platform admin operates Pilot itself, across every organization — a
 * different, narrower group than any organization's own owner/admin
 * members. Not signed in or not a platform admin both send the visitor
 * back to their workspace rather than revealing that `/admin` exists.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminSession> {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");
  const role = await getPlatformAdminRole(user.id);
  if (!role) redirect("/chat");
  return { user: { id: user.id, email: user.email }, role };
}

export function requireSuperadmin(session: PlatformAdminSession) {
  if (session.role !== "superadmin") redirect("/admin");
}
