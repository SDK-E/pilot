import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lifecycleOperations } from "@/db/schema";
import type {
  CreateOperationInput,
  ListOperationsInput,
  LifecycleOperation,
  UpdateOperationStatusInput,
} from "./lifecycle-types";

export async function createLifecycleOperation(
  input: CreateOperationInput,
): Promise<LifecycleOperation> {
  const [operation] = await db
    .insert(lifecycleOperations)
    .values({
      organizationId: input.organizationId,
      actorId: input.actorId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      phase: input.phase ?? "pending",
    })
    .returning();
  return normalize(operation);
}

export async function getOperation(
  operationId: string,
): Promise<LifecycleOperation | undefined> {
  const [operation] = await db
    .select()
    .from(lifecycleOperations)
    .where(eq(lifecycleOperations.id, operationId))
    .limit(1);
  return operation ? normalize(operation) : undefined;
}

export async function listOperations(input: ListOperationsInput) {
  const where = [eq(lifecycleOperations.organizationId, input.organizationId)];
  if (input.phase) {
    where.push(eq(lifecycleOperations.phase, input.phase));
  }
  if (input.status) {
    where.push(eq(lifecycleOperations.status, input.status));
  }
  return db
    .select()
    .from(lifecycleOperations)
    .where(and(...where))
    .orderBy(lifecycleOperations.createdAt);
}

export async function updateOperationStatus(
  input: UpdateOperationStatusInput,
): Promise<void> {
  await db
    .update(lifecycleOperations)
    .set({
      status: input.status,
      errorCode: input.errorCode ?? null,
      attempts: input.attempts ?? undefined,
      nextAttemptAt: input.nextAttemptAt ?? undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(lifecycleOperations.id, input.operationId),
        eq(lifecycleOperations.organizationId, input.organizationId),
      ),
    );
}

function normalize(
  row: typeof lifecycleOperations.$inferSelect,
): LifecycleOperation {
  return {
    id: row.id,
    organizationId: row.organizationId,
    actorId: row.actorId,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    phase: row.phase,
    attempts: row.attempts,
    nextAttemptAt: row.nextAttemptAt,
    status: row.status,
    errorCode: row.errorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
