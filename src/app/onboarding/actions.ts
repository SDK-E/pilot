"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createLocalOrganization } from "@/organizations/local-workspace";
import { LOCAL_ORGANIZATION_COOKIE } from "@/organizations/workspace-session";

const organizationNameSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

/**
 * Creates a new local workspace and switches into it. Reachable both as the
 * landing page for a user with no workspace yet, and as an explicit
 * "Create organization" action for a user who already has one and wants
 * another — Pilot places no limit on how many a user belongs to.
 */
export async function createOrganizationAction(formData: FormData) {
  const input = organizationNameSchema.safeParse({
    name: formData.get("name"),
  });
  if (!input.success) throw new Error("Enter a workspace name.");
  const { user } = await withAuth({ ensureSignedIn: true });

  const workspace = await createLocalOrganization({
    name: input.data.name,
    owner: { id: user.id, email: user.email },
  });

  const cookieStore = await cookies();
  cookieStore.set(LOCAL_ORGANIZATION_COOKIE, workspace.organizationId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/chat");
}
