import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import {
  createConversation,
  getConversation,
} from "@/conversations/conversation-repository";
import {
  createWorker,
  deleteWorker,
  getWorker,
  listWorkers,
} from "@/workers/worker-repository";

const suffix = randomUUID().replaceAll("-", "");
const organizationId = `org_test_${suffix}`;
const userA = `user_a_${suffix}`;
const userB = `user_b_${suffix}`;
const userC = `user_c_${suffix}`;

test.after(async () => {
  await db
    .delete(organizations)
    .where(eq(organizations.id, organizationId))
    .catch(() => {});
});

test("persona archive preserves conversations", async () => {
  await db
    .insert(organizations)
    .values({ id: organizationId, name: "Test Org" })
    .onConflictDoNothing();

  const worker = await createWorker({
    organization: { id: organizationId, name: "Test Org" },
    member: { id: `mem_1_${suffix}`, roleSlug: "member" },
    user: { id: userA, email: "a@test.com" },
    worker: {
      name: "Test Persona",
      instructions: "Test",
      modelId: "kilo/kilo-auto/free",
      baseAgentId: "conversational",
      enabledToolIds: [],
      knowledgeSourceIds: [],
      approvalRules: {},
    },
  });

  const conv = await createConversation({
    organizationId,
    workerId: worker.id,
    createdByWorkosUserId: userA,
    title: "Test Chat",
  });
  assert.ok(conv, "Conversation should be created");

  const fetched = await getConversation(
    organizationId,
    worker.id,
    conv.id,
    userA,
  );
  assert.ok(fetched, "Conversation should exist before archive");

  await deleteWorker(organizationId, worker.id);

  const archived = await getWorker(organizationId, worker.id);
  assert.ok(archived, "Worker should exist after archive (soft delete)");
  assert.equal(archived?.archived, true, "Worker should be archived");

  const stillThere = await getConversation(
    organizationId,
    worker.id,
    conv.id,
    userA,
  );
  assert.ok(stillThere, "Conversation should exist after persona archive");
});

test("archived worker visible in list with archived flag", async () => {
  const worker = await createWorker({
    organization: { id: organizationId, name: "Test Org" },
    member: { id: `mem_2_${suffix}`, roleSlug: "member" },
    user: { id: userB, email: "b@test.com" },
    worker: {
      name: "To Archive",
      instructions: "Test",
      modelId: "kilo/kilo-auto/free",
      baseAgentId: "conversational",
      enabledToolIds: [],
      knowledgeSourceIds: [],
      approvalRules: {},
    },
  });

  await deleteWorker(organizationId, worker.id);

  const all = await listWorkers(organizationId);
  const found = all.find((w) => w.id === worker.id);
  assert.ok(found, "Archived worker should appear in list");
  assert.equal(found?.archived, true);
});

test("archive is idempotent", async () => {
  const worker = await createWorker({
    organization: { id: organizationId, name: "Test Org" },
    member: { id: `mem_3_${suffix}`, roleSlug: "member" },
    user: { id: userC, email: "c@test.com" },
    worker: {
      name: "Idempotent Archive",
      instructions: "Test",
      modelId: "kilo/kilo-auto/free",
      baseAgentId: "conversational",
      enabledToolIds: [],
      knowledgeSourceIds: [],
      approvalRules: {},
    },
  });

  await deleteWorker(organizationId, worker.id);
  await deleteWorker(organizationId, worker.id);

  const archived = await getWorker(organizationId, worker.id);
  assert.ok(archived, "Worker should still exist");
  assert.equal(archived?.archived, true);
});
