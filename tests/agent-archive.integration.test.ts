import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { eq } from "drizzle-orm";

import {
  archiveAgent,
  createAgent,
  getAgent,
  listAgents,
} from "@/agents/agent-repository";
import {
  createConversation,
  getConversation,
} from "@/conversations/conversation-repository";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";

const suffix = randomUUID().replaceAll("-", "");
const organizationId = `org_test_${suffix}`;
const userId = `user_${suffix}`;

const context = {
  organization: { id: organizationId, name: "Test Org" },
  member: { id: `mem_${suffix}`, roleSlug: "member" },
  user: { id: userId, email: "a@test.com" },
};

function agentNamed(name: string) {
  return {
    name,
    instructions: "Test",
    modelId: "kilo/kilo-auto/free",
    baseAgentId: "chat" as const,
    enabledToolIds: [],
    approvalRules: {},
  };
}

test.after(async () => {
  await db.delete(organizations).where(eq(organizations.id, organizationId));
});

test("archiving an agent keeps its conversations readable", async () => {
  const agent = await createAgent(context, agentNamed("Test Agent"));
  const owner = { organizationId, userId };
  const conversation = await createConversation(owner, {
    agentId: agent.id,
    title: "Test Chat",
  });
  assert.ok(conversation);

  await archiveAgent(organizationId, agent.id);

  const archived = await getAgent(organizationId, agent.id);
  assert.equal(archived?.archived, true);
  assert.ok(await getConversation(owner, conversation.id));
});

test("an archived agent leaves the list and archiving twice is harmless", async () => {
  const agent = await createAgent(context, agentNamed("To Archive"));
  await archiveAgent(organizationId, agent.id);
  await archiveAgent(organizationId, agent.id);

  const listed = await listAgents(organizationId);
  assert.equal(
    listed.some((candidate) => candidate.id === agent.id),
    false,
  );
  assert.equal((await getAgent(organizationId, agent.id))?.archived, true);
});
