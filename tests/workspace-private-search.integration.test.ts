import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, organizations, workers } from "@/db/schema";
import {
  createConversation,
  listOrganizationConversations,
} from "@/conversations/conversation-repository";

test("AC-07-02: private workspace search excludes other user's titles", async () => {
  const suffix = randomUUID().replaceAll("-", "");
  const orgId = `org_search_test_${suffix}`;
  const userA = `user_a_search_${suffix}`;
  const userB = `user_b_search_${suffix}`;
  const workerIdA = randomUUID();
  const workerIdB = randomUUID();

  await db
    .insert(organizations)
    .values({
      id: orgId,
      name: "Search Test Org",
    })
    .onConflictDoNothing();

  await db
    .insert(workers)
    .values([
      {
        id: workerIdA,
        organizationId: orgId,
        name: "Agent A",
        instructions: "",
        modelId: "kilo/kilo-auto/free",
        createdByWorkosUserId: userA,
      },
      {
        id: workerIdB,
        organizationId: orgId,
        name: "Agent B",
        instructions: "",
        modelId: "kilo/kilo-auto/free",
        createdByWorkosUserId: userB,
      },
    ])
    .onConflictDoUpdate({
      target: workers.id,
      set: { name: "Agent B" },
    });

  await createConversation({
    organizationId: orgId,
    workerId: workerIdB,
    createdByWorkosUserId: userB,
    title: "B's Secret Planning",
  });

  const userAResults = await listOrganizationConversations(
    orgId,
    userA,
    "Secret",
  );
  const userATitles = userAResults.map((c) => c.title);
  assert.equal(
    userATitles.some((title) => title?.includes("Secret")),
    false,
    "User A should not see User B's conversation titles in search results",
  );

  const userBResults = await listOrganizationConversations(
    orgId,
    userB,
    "Secret",
  );
  assert.equal(
    userBResults.length,
    1,
    "User B should see their own conversation",
  );
  assert.equal(userBResults[0].title, "B's Secret Planning");

  const userANoMatch = await listOrganizationConversations(
    orgId,
    userA,
    "XYZNonExistentQuery",
  );
  assert.equal(userANoMatch.length, 0);

  await db
    .delete(conversations)
    .where(eq(conversations.createdByWorkosUserId, userB))
    .catch(() => {});
  await db
    .delete(workers)
    .where(eq(workers.createdByWorkosUserId, userA))
    .catch(() => {});
  await db
    .delete(workers)
    .where(eq(workers.createdByWorkosUserId, userB))
    .catch(() => {});
  await db
    .delete(organizations)
    .where(eq(organizations.id, orgId))
    .catch(() => {});
});
