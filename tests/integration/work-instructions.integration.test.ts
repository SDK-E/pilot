import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { eq } from "drizzle-orm";

import { loadRuntimeAgent } from "@/conversations/runtime-agent";
import { startConversation } from "@/conversations/start-conversation";
import { db } from "@/db/client";
import { organizations, userPreferences } from "@/db/schema";
import { updateWorkInstructions } from "@/users/user-preference-repository";

const suffix = randomUUID().replaceAll("-", "");
const organizationId = `org_pilot_test_${suffix}`;
const userId = `user_${suffix}`;

const context = {
  organization: { id: organizationId, name: "Pilot test organization" },
  member: { id: `om_${suffix}`, roleSlug: "member" },
  user: { id: userId, email: "test@example.com" },
};

test.after(async () => {
  await db
    .delete(userPreferences)
    .where(eq(userPreferences.workosUserId, userId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
});

test("a user's standing instructions reach Work but never Chat or Code", async () => {
  await updateWorkInstructions({
    workosUserId: userId,
    workInstructions: "Always cite sources.",
  });

  const work = await startConversation({
    context,
    kind: "work",
    message: "Research this for me",
  });
  assert.ok(work.ok);
  assert.match(work.agent.instructions, /Always cite sources\./);

  const chat = await startConversation({
    context,
    kind: "chat",
    message: "Hello",
  });
  assert.ok(chat.ok);
  assert.doesNotMatch(chat.agent.instructions, /Always cite sources\./);

  const code = await startConversation({
    context,
    kind: "code",
    message: "Review this function",
  });
  assert.ok(code.ok);
  assert.doesNotMatch(code.agent.instructions, /Always cite sources\./);
});

test("loadRuntimeAgent applies the requesting user's Work instructions on follow-up turns", async () => {
  const work = await startConversation({
    context,
    kind: "work",
    message: "Plan a launch",
  });
  assert.ok(work.ok);

  const reloaded = await loadRuntimeAgent(
    organizationId,
    work.agent.id,
    userId,
  );
  assert.ok(reloaded);
  assert.match(reloaded.instructions, /Always cite sources\./);

  const otherUserId = `another_user_${suffix}`;
  const reloadedForAnotherUser = await loadRuntimeAgent(
    organizationId,
    work.agent.id,
    otherUserId,
  );
  assert.ok(reloadedForAnotherUser);
  assert.doesNotMatch(
    reloadedForAnotherUser.instructions,
    /Always cite sources\./,
  );
});
