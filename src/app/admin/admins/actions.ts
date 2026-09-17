"use server";

import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  addPlatformAdmin,
  removePlatformAdmin,
} from "@/platform/platform-admin-repository";
import {
  requirePlatformAdmin,
  requireSuperadmin,
} from "@/platform/platform-session";

export interface AdminFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

const newAdminSchema = z.object({
  email: z.email(),
  role: z.enum(["superadmin", "admin"]),
});

export async function addPlatformAdminAction(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  const parsed = newAdminSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email and role." };
  }

  const { data: users } = await getWorkOS().userManagement.listUsers({
    email: parsed.data.email,
  });
  const [user] = users;
  if (!user) {
    return {
      status: "error",
      message: "No WorkOS account with that email has signed in to Pilot yet.",
    };
  }

  await addPlatformAdmin({
    workosUserId: user.id,
    email: parsed.data.email,
    role: parsed.data.role,
    addedByWorkosUserId: session.user.id,
  });
  revalidatePath("/admin/admins");
  return {
    status: "success",
    message: `${parsed.data.email} can now administer Pilot.`,
  };
}

export async function removePlatformAdminAction(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  const workosUserId = formData.get("workosUserId");
  if (typeof workosUserId !== "string" || !workosUserId) {
    return { status: "error", message: "This admin is unavailable." };
  }
  const result = await removePlatformAdmin(workosUserId);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath("/admin/admins");
  return { status: "success", message: "Admin access removed." };
}
