import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import {
  createConversation,
  getConversation,
  listConversations,
} from "@/conversations/conversation-repository";
import {
  createWorker,
  getWorker,
  listWorkers,
} from "@/workers/worker-repository";

const suffix = randomUUID().replaceAll("-", "");
const organizationId = `org_pilot_test_${suffix}`;
const otherOrganizationId = `org_pilot_test_other_${suffix}`;

function workerInput(overrides: Partial<{ name: string }> = {}) {
  return {
    organization: { id: organizationId, name: "Pilot test organization" },
    member: { id: `om_${suffix}`, roleSlug: "member" },
    user: { id: `user_${suffix}`, email: "test@example.com" },
    worker: {
      name: "Research assistant",
      instructions: "Return concise research with sources.",
      modelId: "provider/research-model",
      ...overrides,
    },
  };
}

test("workers are persisted and isolated by organization", async (t) => {
  t.after(async () => {
    await db.delete(organizations).where(eq(organizations.id, organizationId));
    await db
      .delete(organizations)
      .where(eq(organizations.id, otherOrganizationId));
  });

  const created = await createWorker(workerInput());
  assert.ok(created);
  assert.equal(created.name, "Research assistant");

  const fetched = await getWorker(organizationId, created.id);
  assert.equal(fetched?.id, created.id);
  assert.equal(fetched?.instructions, "Return concise research with sources.");
  assert.equal(await getWorker(otherOrganizationId, created.id), undefined);

  const conversation = await createConversation({
    organizationId,
    workerId: created.id,
    createdByWorkosUserId: `user_${suffix}`,
  });
  assert.ok(conversation);
  assert.equal(
    await createConversation({
      organizationId: otherOrganizationId,
      workerId: created.id,
      createdByWorkosUserId: `user_${suffix}`,
    }),
    undefined,
  );
  assert.deepEqual(
    (await listConversations(organizationId, created.id)).map(
      (item) => item.id,
    ),
    [conversation.id],
  );
  assert.equal(
    (await getConversation(organizationId, created.id, conversation.id))?.id,
    conversation.id,
  );
  assert.equal(
    await getConversation(otherOrganizationId, created.id, conversation.id),
    undefined,
  );

  const organizationWorkers = await listWorkers(organizationId);
  assert.deepEqual(
    organizationWorkers.map((worker) => worker.name),
    ["Research assistant"],
  );

  await assert.rejects(
    createWorker(workerInput()),
    (error: { code?: string }) => error.code === "23505",
  );

  await createWorker({
    ...workerInput({ name: "Separate organization worker" }),
    organization: {
      id: otherOrganizationId,
      name: "Other Pilot test organization",
    },
    member: { id: `om_other_${suffix}`, roleSlug: "member" },
  });
  const isolatedWorkers = await listWorkers(otherOrganizationId);
  assert.deepEqual(
    isolatedWorkers.map((worker) => worker.name),
    ["Separate organization worker"],
  );
});
