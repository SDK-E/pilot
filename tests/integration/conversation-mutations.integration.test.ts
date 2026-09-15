import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { eq } from "drizzle-orm";

import {
  appendConversationMessageContent,
  deleteMessagesFrom,
  getConversationMessage,
  getPrecedingUserMessage,
  isLastMessage,
} from "@/conversations/conversation-message-repository";
import {
  createConversation,
  createConversationMessage,
} from "@/conversations/conversation-repository";
import { db } from "@/db/client";
import { conversationMessages, organizations, workers } from "@/db/schema";
import {
  hasRunningExecution,
  startExecution,
} from "@/executions/execution-repository";

function remainingMessages(conversationId: string) {
  return db
    .select({ id: conversationMessages.id })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId));
}

async function seed(suffix: string) {
  const organizationId = `org_mutations_test_${suffix}`;
  const userId = `user_mutations_${suffix}`;
  const agentId = randomUUID();
  await db
    .insert(organizations)
    .values({ id: organizationId, name: "Mutations Test Org" })
    .onConflictDoNothing();
  await db.insert(workers).values({
    id: agentId,
    organizationId,
    name: "Agent",
    instructions: "",
    modelId: "kilo/kilo-auto/free",
    createdByWorkosUserId: userId,
  });
  const conversation = await createConversation(
    { organizationId, userId },
    { agentId, title: "Edit and regenerate" },
  );
  assert.ok(conversation);
  return { organizationId, userId, agentId, conversationId: conversation.id };
}

test("editing a message discards it and everything sent after it", async () => {
  const suffix = randomUUID().replaceAll("-", "");
  const seeded = await seed(suffix);
  const owner = {
    organizationId: seeded.organizationId,
    userId: seeded.userId,
  };

  try {
    const first = await createConversationMessage(owner, {
      conversationId: seeded.conversationId,
      role: "user",
      content: "First question",
    });
    const reply = await createConversationMessage(owner, {
      conversationId: seeded.conversationId,
      role: "worker",
      content: "First answer",
    });
    const second = await createConversationMessage(owner, {
      conversationId: seeded.conversationId,
      role: "user",
      content: "Second question",
    });
    assert.ok(first && reply && second);

    assert.equal(
      await isLastMessage(seeded.conversationId, reply.id, reply.createdAt),
      false,
    );
    assert.equal(
      await isLastMessage(seeded.conversationId, second.id, second.createdAt),
      true,
    );

    await deleteMessagesFrom(owner, seeded.conversationId, first.createdAt);

    const remaining = await remainingMessages(seeded.conversationId);
    assert.equal(remaining.length, 0);
  } finally {
    await db
      .delete(organizations)
      .where(eq(organizations.id, seeded.organizationId));
  }
});

test("regenerate resolves the untouched user message before the reply being replaced", async () => {
  const suffix = randomUUID().replaceAll("-", "");
  const seeded = await seed(suffix);
  const owner = {
    organizationId: seeded.organizationId,
    userId: seeded.userId,
  };

  try {
    const prompt = await createConversationMessage(owner, {
      conversationId: seeded.conversationId,
      role: "user",
      content: "What is 2+2?",
    });
    const reply = await createConversationMessage(owner, {
      conversationId: seeded.conversationId,
      role: "worker",
      content: "It's 5.",
    });
    assert.ok(prompt && reply);

    const preceding = await getPrecedingUserMessage(
      seeded.conversationId,
      reply.createdAt,
    );
    assert.ok(preceding);
    assert.equal(preceding.id, prompt.id);
    assert.equal(preceding.content, "What is 2+2?");

    await deleteMessagesFrom(owner, seeded.conversationId, reply.createdAt);

    const remaining = await remainingMessages(seeded.conversationId);
    assert.deepEqual(
      remaining.map((message) => message.id),
      [prompt.id],
    );
  } finally {
    await db
      .delete(organizations)
      .where(eq(organizations.id, seeded.organizationId));
  }
});

test("a stopped reply can be resumed: continuation text is appended and isPartial clears", async () => {
  const suffix = randomUUID().replaceAll("-", "");
  const seeded = await seed(suffix);
  const owner = {
    organizationId: seeded.organizationId,
    userId: seeded.userId,
  };

  try {
    const stopped = await createConversationMessage(owner, {
      conversationId: seeded.conversationId,
      role: "worker",
      content: "Paris is the capital",
      isPartial: true,
    });
    assert.ok(stopped);

    const midway = await getConversationMessage(
      owner,
      seeded.conversationId,
      stopped.id,
    );
    assert.equal(midway?.isPartial, true);

    await appendConversationMessageContent(
      owner,
      stopped.id,
      " of France.",
      false,
    );

    const resumed = await getConversationMessage(
      owner,
      seeded.conversationId,
      stopped.id,
    );
    assert.ok(resumed);
    assert.equal(resumed.content, "Paris is the capital of France.");
    assert.equal(resumed.isPartial, false);
  } finally {
    await db
      .delete(organizations)
      .where(eq(organizations.id, seeded.organizationId));
  }
});

test("a continuation stopped again keeps appending and staying partial", async () => {
  const suffix = randomUUID().replaceAll("-", "");
  const seeded = await seed(suffix);
  const owner = {
    organizationId: seeded.organizationId,
    userId: seeded.userId,
  };

  try {
    const stopped = await createConversationMessage(owner, {
      conversationId: seeded.conversationId,
      role: "worker",
      content: "Once upon a time",
      isPartial: true,
    });
    assert.ok(stopped);

    await appendConversationMessageContent(
      owner,
      stopped.id,
      " there was a",
      true,
    );

    const stillPartial = await getConversationMessage(
      owner,
      seeded.conversationId,
      stopped.id,
    );
    assert.ok(stillPartial);
    assert.equal(stillPartial.content, "Once upon a time there was a");
    assert.equal(stillPartial.isPartial, true);
  } finally {
    await db
      .delete(organizations)
      .where(eq(organizations.id, seeded.organizationId));
  }
});

test("edit and regenerate are refused while a turn is still running", async () => {
  const suffix = randomUUID().replaceAll("-", "");
  const seeded = await seed(suffix);

  try {
    assert.equal(
      await hasRunningExecution(seeded.organizationId, seeded.conversationId),
      false,
    );
    const execution = await startExecution({
      organizationId: seeded.organizationId,
      workerId: seeded.agentId,
      conversationId: seeded.conversationId,
    });
    assert.ok(execution);
    assert.equal(
      await hasRunningExecution(seeded.organizationId, seeded.conversationId),
      true,
    );
  } finally {
    await db
      .delete(organizations)
      .where(eq(organizations.id, seeded.organizationId));
  }
});
