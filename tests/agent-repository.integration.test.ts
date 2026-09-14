import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { eq } from "drizzle-orm";

import { createAgent, getAgent, listAgents } from "@/agents/agent-repository";
import {
  createConversation,
  createConversationMessage,
  getConversation,
  listConversationMessages,
  listConversations,
  renameConversation,
} from "@/conversations/conversation-repository";
import { db } from "@/db/client";
import { organizations, userPreferences } from "@/db/schema";
import {
  appendToolActivity,
  finishExecution,
  listConversationActivity,
  startExecution,
} from "@/executions/execution-repository";
import {
  getOrganizationPreferences,
  updateOrganizationDefaultWorker,
} from "@/organizations/organization-preference-repository";
import {
  addProjectConversation,
  createProject,
  deleteProject,
  getProject,
  getProjectMemoryCleanupTargetForConversation,
  getProjectMemoryContextForConversation,
  listProjectConversations,
  removeProjectConversation,
  updateProject,
} from "@/projects/project-repository";
import {
  createTask,
  listConversationTasks,
  listTasks,
  updateUserManagedTaskStatus,
} from "@/tasks/task-repository";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/users/user-preference-repository";

const suffix = randomUUID().replaceAll("-", "");
const organizationId = `org_pilot_test_${suffix}`;
const otherOrganizationId = `org_pilot_test_other_${suffix}`;
const userId = `user_${suffix}`;
const otherUserId = `another_user_${suffix}`;
const owner = { organizationId, userId };
const stranger = { organizationId, userId: otherUserId };

const context = {
  organization: { id: organizationId, name: "Pilot test organization" },
  member: { id: `om_${suffix}`, roleSlug: "member" },
  user: { id: userId, email: "test@example.com" },
};

function agentInput(name = "Writing assistant") {
  return {
    name,
    instructions: "Return concise answers with sources.",
    modelId: "kilo/kilo-auto/free",
    baseAgentId: "chat" as const,
    goals: "Find clear answers.",
    tone: "Concise",
    outputFormat: "Markdown",
    enabledToolIds: ["web-search"],
    approvalRules: { "web-search": "ask" as const },
  };
}

test.after(async () => {
  await db
    .delete(userPreferences)
    .where(eq(userPreferences.workosUserId, userId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db
    .delete(organizations)
    .where(eq(organizations.id, otherOrganizationId));
});

test("agents are persisted, unique by name, and isolated by organization", async () => {
  const created = await createAgent(context, agentInput());
  const fetched = await getAgent(organizationId, created.id);
  assert.ok(fetched);
  assert.equal(fetched.baseAgentId, "chat");
  assert.deepEqual(fetched.enabledToolIds, ["web-search"]);
  assert.deepEqual(fetched.approvalRules, { "web-search": "ask" });
  assert.equal(await getAgent(otherOrganizationId, created.id), undefined);

  await assert.rejects(
    createAgent(context, agentInput()),
    (error: { code?: string }) => error.code === "23505",
  );
  await createAgent(
    {
      ...context,
      organization: { id: otherOrganizationId, name: "Other organization" },
      member: { id: `om_other_${suffix}`, roleSlug: "member" },
    },
    agentInput("Separate organization agent"),
  );
  assert.deepEqual(
    (await listAgents(organizationId)).map((agent) => agent.name),
    ["Writing assistant"],
  );
  assert.deepEqual(
    (await listAgents(otherOrganizationId)).map((agent) => agent.name),
    ["Separate organization agent"],
  );
});

test("preferences default and update per user and organization", async () => {
  const [agent] = await listAgents(organizationId);
  assert.ok(agent);
  assert.deepEqual(await getUserPreferences(userId), {
    sendMessageShortcut: "mod_enter",
    conversationPanelLayout: null,
  });
  await updateUserPreferences({
    workosUserId: userId,
    sendMessageShortcut: "enter",
  });
  assert.equal((await getUserPreferences(userId)).sendMessageShortcut, "enter");

  assert.equal(
    (await getOrganizationPreferences(organizationId)).defaultWorkerId,
    null,
  );
  assert.equal(
    await updateOrganizationDefaultWorker({
      organizationId: otherOrganizationId,
      defaultWorkerId: agent.id,
    }),
    undefined,
  );
  await updateOrganizationDefaultWorker({
    organizationId,
    defaultWorkerId: agent.id,
  });
  assert.equal(
    (await getOrganizationPreferences(organizationId)).defaultWorkerId,
    agent.id,
  );
});

test("conversations, messages, and activity stay private to their creator", async () => {
  const [agent] = await listAgents(organizationId);
  assert.ok(agent);
  const conversation = await createConversation(owner, {
    agentId: agent.id,
    title: "Remember this question",
  });
  assert.ok(conversation);
  assert.equal(
    await createConversation(
      { ...owner, organizationId: otherOrganizationId },
      { agentId: agent.id },
    ),
    undefined,
  );

  assert.equal(
    await renameConversation(stranger, conversation.id, "Forged"),
    undefined,
  );
  assert.deepEqual(
    await renameConversation(owner, conversation.id, "Renamed"),
    {
      id: conversation.id,
      title: "Renamed",
    },
  );
  assert.deepEqual(
    (await listConversations(owner)).map((item) => [
      item.id,
      item.title,
      item.kind,
    ]),
    [[conversation.id, "Renamed", "chat"]],
  );
  assert.deepEqual(await listConversations(stranger), []);
  assert.equal(
    (await getConversation(owner, conversation.id))?.agentId,
    agent.id,
  );
  assert.equal(await getConversation(stranger, conversation.id), undefined);

  const userMessage = await createConversationMessage(owner, {
    conversationId: conversation.id,
    role: "user",
    content: "What did I ask you to remember?",
  });
  const reply = await createConversationMessage(owner, {
    conversationId: conversation.id,
    role: "worker",
    content: "You asked me to remember this question.",
    modelId: "kilo/kilo-auto/free",
    runtimeRunId: "run_test",
    latencyMs: 12,
    inputTokens: 8,
    outputTokens: 9,
    totalTokens: 17,
  });
  assert.ok(userMessage && reply);
  assert.deepEqual(
    (await listConversationMessages(owner, conversation.id))?.map(
      (m) => m.content,
    ),
    [
      "What did I ask you to remember?",
      "You asked me to remember this question.",
    ],
  );
  assert.equal(
    await createConversationMessage(stranger, {
      conversationId: conversation.id,
      role: "user",
      content: "Forged",
    }),
    undefined,
  );
  assert.equal(
    await listConversationMessages(stranger, conversation.id),
    undefined,
  );

  const execution = await startExecution({
    organizationId,
    workerId: agent.id,
    conversationId: conversation.id,
  });
  assert.ok(execution);
  for (const state of ["started", "completed"] as const) {
    await appendToolActivity({
      organizationId,
      executionId: execution.id,
      toolId: "web-search",
      toolCallId: "tool-call-1",
      state,
    });
  }
  await finishExecution({
    organizationId,
    executionId: execution.id,
    conversationMessageId: reply.id,
    runtimeRunId: "run_test",
  });
  assert.deepEqual(
    (
      await listConversationActivity(organizationId, conversation.id, userId)
    ).map((event) => [event.type, event.summary]),
    [
      ["execution.started", "Generating a response"],
      ["tool.started", "Searching the web…"],
      ["tool.completed", "Searching the web completed"],
      ["execution.completed", "Response completed"],
    ],
  );
  assert.deepEqual(
    await listConversationActivity(
      organizationId,
      conversation.id,
      otherUserId,
    ),
    [],
  );
});

test("projects and tasks join through the creator's conversations", async () => {
  const [agent] = await listAgents(organizationId);
  assert.ok(agent);
  const [conversation] = await listConversations(owner);
  assert.ok(conversation);
  const project = await createProject({
    ...owner,
    name: "Launch",
    instructions: "Keep the work focused on launch evidence.",
  });
  assert.ok(project);
  assert.equal(
    await getProject({ ...stranger, projectId: project.id }),
    undefined,
  );
  assert.equal(
    await addProjectConversation({
      ...stranger,
      projectId: project.id,
      conversationId: conversation.id,
    }),
    undefined,
  );
  assert.ok(
    await addProjectConversation({
      ...owner,
      projectId: project.id,
      conversationId: conversation.id,
    }),
  );
  assert.deepEqual(
    (await listProjectConversations({ ...owner, projectId: project.id })).map(
      (c) => c.kind,
    ),
    ["chat"],
  );
  assert.equal(
    (
      await getProjectMemoryContextForConversation({
        ...owner,
        conversationId: conversation.id,
      })
    )?.id,
    project.id,
  );
  await updateProject({
    ...owner,
    projectId: project.id,
    name: "Launch",
    sharedMemoryEnabled: true,
  });
  assert.deepEqual(
    await getProjectMemoryCleanupTargetForConversation({
      ...owner,
      conversationId: conversation.id,
    }),
    { id: project.id, sharedMemoryEnabled: true, workerId: agent.id },
  );
  assert.equal(
    (
      await removeProjectConversation({
        ...owner,
        projectId: project.id,
        conversationId: conversation.id,
      })
    )?.conversationId,
    conversation.id,
  );
  assert.equal(
    await deleteProject({ ...stranger, projectId: project.id }),
    undefined,
  );
  assert.ok(await deleteProject({ ...owner, projectId: project.id }));

  const task = await createTask({
    organizationId,
    createdByWorkosUserId: userId,
    workerId: agent.id,
    conversationId: conversation.id,
    title: "Document the answer",
    instructions: "Capture the answer in the project notes.",
  });
  assert.ok(task);
  assert.equal(
    await createTask({
      organizationId,
      createdByWorkosUserId: otherUserId,
      conversationId: conversation.id,
      title: "Forged task",
      instructions: "Must not be created.",
    }),
    undefined,
  );
  assert.deepEqual(
    (
      await listConversationTasks({ ...owner, conversationId: conversation.id })
    ).map((t) => t.title),
    ["Document the answer"],
  );
  assert.deepEqual((await listTasks(stranger)).length, 0);
  assert.equal(
    await updateUserManagedTaskStatus({
      ...stranger,
      taskId: task.id,
      status: "cancelled",
    }),
    undefined,
  );
  assert.deepEqual(
    await updateUserManagedTaskStatus({
      ...owner,
      taskId: task.id,
      status: "completed",
    }),
    { id: task.id, status: "completed" },
  );
});
