import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { members, organizations, workers } from "@/db/schema";

type WorkerMembership = {
  id: string;
  roleSlug: string;
};

type CreateWorkerInput = {
  organization: { id: string; name: string };
  member: WorkerMembership;
  user: { id: string; email: string };
  worker: { name: string; instructions: string; modelId: string };
};

export async function createWorker(input: CreateWorkerInput) {
  const now = new Date();
  const [, , createdWorkers] = await db.batch([
    db
      .insert(organizations)
      .values({ id: input.organization.id, name: input.organization.name })
      .onConflictDoUpdate({
        target: organizations.id,
        set: { name: input.organization.name, updatedAt: now },
      }),
    db
      .insert(members)
      .values({
        organizationId: input.organization.id,
        workosUserId: input.user.id,
        workosMembershipId: input.member.id,
        email: input.user.email,
        roleSlug: input.member.roleSlug,
      })
      .onConflictDoUpdate({
        target: [members.organizationId, members.workosUserId],
        set: {
          workosMembershipId: input.member.id,
          email: input.user.email,
          roleSlug: input.member.roleSlug,
          updatedAt: now,
        },
      }),
    db
      .insert(workers)
      .values({
        organizationId: input.organization.id,
        name: input.worker.name,
        instructions: input.worker.instructions,
        modelId: input.worker.modelId,
        createdByWorkosUserId: input.user.id,
      })
      .returning({ id: workers.id, name: workers.name }),
  ]);

  return createdWorkers[0];
}

export async function listWorkers(organizationId: string) {
  return db
    .select({
      id: workers.id,
      name: workers.name,
      instructions: workers.instructions,
      modelId: workers.modelId,
      createdAt: workers.createdAt,
    })
    .from(workers)
    .where(eq(workers.organizationId, organizationId))
    .orderBy(desc(workers.createdAt));
}

export async function getWorker(organizationId: string, workerId: string) {
  const [worker] = await db
    .select({
      id: workers.id,
      name: workers.name,
      instructions: workers.instructions,
      modelId: workers.modelId,
      createdAt: workers.createdAt,
      updatedAt: workers.updatedAt,
    })
    .from(workers)
    .where(
      and(eq(workers.organizationId, organizationId), eq(workers.id, workerId)),
    )
    .limit(1);

  return worker;
}
