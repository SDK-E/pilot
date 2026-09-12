import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import {
  createLifecycleOperation,
  getOperation,
  listOperations,
  updateOperationStatus,
} from "@/lifecycle/lifecycle-repository";
import { LifecyclePhase } from "@/lifecycle/lifecycle-types";

const suffix = randomUUID().replaceAll("-", "");
const orgTest = `org_test_${suffix}`;
const orgA = `org_a_${suffix}`;
const orgB = `org_b_${suffix}`;

test.after(async () => {
  await db
    .delete(organizations)
    .where(eq(organizations.id, orgTest))
    .catch(() => {});
  await db
    .delete(organizations)
    .where(eq(organizations.id, orgA))
    .catch(() => {});
  await db
    .delete(organizations)
    .where(eq(organizations.id, orgB))
    .catch(() => {});
});

test("create lifecycle operation", async () => {
  await db
    .insert(organizations)
    .values({ id: orgTest, name: "Test Org" })
    .onConflictDoNothing();
  const op = await createLifecycleOperation({
    organizationId: orgTest,
    actorId: "user_a",
    resourceType: "worker",
    resourceId: randomUUID(),
    phase: "pending",
  });
  assert.equal(op.organizationId, orgTest);
  assert.equal(op.actorId, "user_a");
  assert.equal(op.resourceType, "worker");
  assert.equal(op.phase, "pending");
  assert.equal(op.status, "pending");
  assert.equal(op.attempts, 0);
  assert.equal(op.errorCode, null);
});

test("operation status transitions", async () => {
  const op = await createLifecycleOperation({
    organizationId: orgTest,
    actorId: "user_a",
    resourceType: "conversation",
    resourceId: randomUUID(),
    phase: "pending",
  });

  await updateOperationStatus({
    operationId: op.id,
    organizationId: orgTest,
    status: "in_progress",
  });

  const updated = await getOperation(op.id);
  assert.equal(updated?.status, "in_progress");

  await updateOperationStatus({
    operationId: op.id,
    organizationId: orgTest,
    status: "completed",
  });

  const final = await getOperation(op.id);
  assert.equal(final?.status, "completed");
});

test("operation with error", async () => {
  const op = await createLifecycleOperation({
    organizationId: orgTest,
    actorId: "user_a",
    resourceType: "blob",
    resourceId: randomUUID(),
    phase: "in_progress",
  });

  await updateOperationStatus({
    operationId: op.id,
    organizationId: orgTest,
    status: "failed",
    errorCode: "BLOB_TIMEOUT",
    attempts: 3,
    nextAttemptAt: new Date(Date.now() + 60_000),
  });

  const updated = await getOperation(op.id);
  assert.equal(updated?.status, "failed");
  assert.equal(updated?.errorCode, "BLOB_TIMEOUT");
  assert.equal(updated?.attempts, 3);
  assert.ok(updated?.nextAttemptAt instanceof Date);
});

test("list operations by org and status", async () => {
  await db
    .insert(organizations)
    .values({ id: orgA, name: "Org A" })
    .onConflictDoNothing();
  await db
    .insert(organizations)
    .values({ id: orgB, name: "Org B" })
    .onConflictDoNothing();

  await createLifecycleOperation({
    organizationId: orgA,
    actorId: "user_a",
    resourceType: "worker",
    resourceId: randomUUID(),
  });
  const completedOp = await createLifecycleOperation({
    organizationId: orgA,
    actorId: "user_a",
    resourceType: "conversation",
    resourceId: randomUUID(),
    phase: "completed" as LifecyclePhase,
  });
  await updateOperationStatus({
    operationId: completedOp.id,
    organizationId: orgA,
    status: "completed",
  });
  await createLifecycleOperation({
    organizationId: orgB,
    actorId: "user_b",
    resourceType: "worker",
    resourceId: randomUUID(),
  });

  const orgAOperations = await listOperations({ organizationId: orgA });
  assert.equal(orgAOperations.length, 2);

  const completed = await listOperations({
    organizationId: orgA,
    status: "completed",
  });
  assert.equal(completed.length, 1);
  assert.equal(completed[0]?.resourceType, "conversation");
});

test("cancelled operation", async () => {
  const op = await createLifecycleOperation({
    organizationId: orgTest,
    actorId: "user_a",
    resourceType: "project",
    resourceId: randomUUID(),
  });

  await updateOperationStatus({
    operationId: op.id,
    organizationId: orgTest,
    status: "cancelled",
  });

  const updated = await getOperation(op.id);
  assert.equal(updated?.status, "cancelled");
  assert.ok(updated?.phase !== "completed");
});
