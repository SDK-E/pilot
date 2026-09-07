"use server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { deleteWorker } from "@/workers/worker-repository";

export async function deletePersonaAction(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("workerId"));
  if (!id.success) return;
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) return;
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) return;
  await deleteWorker(organizationId, id.data);
  revalidatePath("/workspace/personas");
  revalidatePath("/workspace/fleet");
}
