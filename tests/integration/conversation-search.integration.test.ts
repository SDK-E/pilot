import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { eq } from "drizzle-orm";

import {
  createConversation,
  listConversations,
} from "@/conversations/conversation-repository";
import { db } from "@/db/client";
import { organizations, workers } from "@/db/schema";

test("conversation search never shows another member's conversations", async () => {
  const suffix = randomUUID().replaceAll("-", "");
  const organizationId = `org_search_test_${suffix}`;
  const userA = `user_a_search_${suffix}`;
  const userB = `user_b_search_${suffix}`;
  const agentId = randomUUID();

  await db
    .insert(organizations)
    .values({ id: organizationId, name: "Search Test Org" })
    .onConflictDoNothing();
  await db.insert(workers).values({
    id: agentId,
    organizationId,
    name: "Agent",
    instructions: "",
    modelId: "kilo/kilo-auto/free",
    createdByWorkosUserId: userB,
  });
  await createConversation(
    { organizationId, userId: userB },
    { agentId, title: "B's Secret Planning" },
  );

  try {
    const forA = await listConversations(
      { organizationId, userId: userA },
      "Secret",
    );
    assert.equal(forA.length, 0);
    const forB = await listConversations(
      { organizationId, userId: userB },
      "Secret",
    );
    const [secret] = forB;
    assert.ok(secret);
    assert.equal(secret.title, "B's Secret Planning");
    assert.equal(secret.kind, "chat");
  } finally {
    await db.delete(organizations).where(eq(organizations.id, organizationId));
  }
});
