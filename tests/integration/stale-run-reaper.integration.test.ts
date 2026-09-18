import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { eq } from "drizzle-orm";

import { createConversation } from "@/conversations/conversation-repository";
import { db } from "@/db/client";
import { agentRuns, executions, organizations, workers } from "@/db/schema";
import { reapAllStaleAgentRuns } from "@/executions/agent-run-repository";
import { reapAllStaleExecutions } from "@/executions/execution-repository";

// Well past STALE_EXECUTION_MS/STALE_AGENT_RUN_MS (10 minutes), so the sweep
// always treats these as abandoned rather than still in flight.
const STALE_STARTED_AT = new Date(Date.now() - 60 * 60 * 1000);

async function seedOrg(suffix: string) {
  const organizationId = `org_stale_reaper_test_${suffix}`;
  const userId = `user_stale_reaper_${suffix}`;
  const agentId = randomUUID();
  await db
    .insert(organizations)
    .values({ id: organizationId, name: "Stale Reaper Test Org" })
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
    { agentId, title: "Stale reaper test" },
  );
  assert.ok(conversation);
  return { organizationId, userId, agentId, conversationId: conversation.id };
}

test("the global reaper closes stale runs across every organization, not just the caller's own", async () => {
  const suffix = randomUUID().replaceAll("-", "");
  // Two distinct organizations: the sweep must reach both, unlike the
  // per-conversation reapers which are scoped to a single organization and
  // conversation and only run opportunistically when that conversation
  // starts its next turn.
  const orgA = await seedOrg(`a_${suffix}`);
  const orgB = await seedOrg(`b_${suffix}`);

  try {
    const [executionA] = await db
      .insert(executions)
      .values({
        organizationId: orgA.organizationId,
        workerId: orgA.agentId,
        conversationId: orgA.conversationId,
        status: "running",
        startedAt: STALE_STARTED_AT,
      })
      .returning({ id: executions.id });
    const [executionB] = await db
      .insert(executions)
      .values({
        organizationId: orgB.organizationId,
        workerId: orgB.agentId,
        conversationId: orgB.conversationId,
        status: "running",
        startedAt: STALE_STARTED_AT,
      })
      .returning({ id: executions.id });
    assert.ok(executionA && executionB);

    await db.insert(agentRuns).values({
      organizationId: orgB.organizationId,
      workerId: orgB.agentId,
      conversationId: orgB.conversationId,
      executionId: executionB.id,
      status: "running",
      maxSteps: 150,
      startedAt: STALE_STARTED_AT,
      updatedAt: STALE_STARTED_AT,
    });

    const reapedCount = await reapAllStaleExecutions();
    assert.ok(reapedCount >= 2);
    await reapAllStaleAgentRuns();

    const [closedA] = await db
      .select({ status: executions.status })
      .from(executions)
      .where(eq(executions.id, executionA.id));
    const [closedB] = await db
      .select({ status: executions.status })
      .from(executions)
      .where(eq(executions.id, executionB.id));
    assert.equal(closedA?.status, "failed");
    assert.equal(closedB?.status, "failed");

    const [closedAgentRun] = await db
      .select({ status: agentRuns.status })
      .from(agentRuns)
      .where(eq(agentRuns.executionId, executionB.id));
    assert.equal(closedAgentRun?.status, "failed");
  } finally {
    await db
      .delete(organizations)
      .where(eq(organizations.id, orgA.organizationId));
    await db
      .delete(organizations)
      .where(eq(organizations.id, orgB.organizationId));
  }
});
