import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationPreferences, workers } from "@/db/schema";

type OrganizationPreferences = { defaultWorkerId: string | null };

const defaults: OrganizationPreferences = { defaultWorkerId: null };

export async function getOrganizationPreferences(organizationId: string) {
  const [preferences] = await db
    .select({ defaultWorkerId: organizationPreferences.defaultWorkerId })
    .from(organizationPreferences)
    .where(eq(organizationPreferences.organizationId, organizationId))
    .limit(1);
  return preferences ?? defaults;
}

export async function updateOrganizationDefaultWorker(input: {
  organizationId: string;
  defaultWorkerId: string;
}) {
  const [worker] = await db
    .select({ id: workers.id })
    .from(workers)
    .where(
      and(
        eq(workers.id, input.defaultWorkerId),
        eq(workers.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!worker) return undefined;

  const [preferences] = await db
    .insert(organizationPreferences)
    .values({
      organizationId: input.organizationId,
      defaultWorkerId: worker.id,
    })
    .onConflictDoUpdate({
      target: organizationPreferences.organizationId,
      set: { defaultWorkerId: worker.id, updatedAt: new Date() },
    })
    .returning({ defaultWorkerId: organizationPreferences.defaultWorkerId });
  return preferences;
}
