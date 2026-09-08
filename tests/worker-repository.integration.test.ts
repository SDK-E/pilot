import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import type { ConfigurableToolId } from "@/agents/agent-configuration";
import { db } from "@/db/client";
import { organizations, userPreferences } from "@/db/schema";
import {
  createConversation,
  createConversationMessage,
  getConversation,
  listConversationMessages,
  listConversations,
  listOrganizationConversations,
  renameConversation,
} from "@/conversations/conversation-repository";
import {
  appendToolActivity,
  finishExecution,
  listConversationActivity,
  startExecution,
} from "@/executions/execution-repository";
import {
  addProjectConversation,
  createProject,
  deleteProject,
  getProject,
  listProjectConversations,
  listProjects,
  removeProjectConversation,
} from "@/projects/project-repository";
import {
  createWorker,
  getWorker,
  listWorkers,
} from "@/workers/worker-repository";
import { createTask, listConversationTasks } from "@/tasks/task-repository";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/users/user-preference-repository";
import {
  getOrganizationPreferences,
  updateOrganizationDefaultWorker,
} from "@/organizations/organization-preference-repository";

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
      baseAgentId: "conversational" as const,
      goals: "Find clear answers.",
      tone: "Concise",
      outputFormat: "Markdown",
      enabledToolIds: ["web-search"] as ConfigurableToolId[],
      knowledgeSourceIds: [],
      approvalRules: { "web-search": "ask" as const },
      ...overrides,
    },
  };
}

test("workers are persisted and isolated by organization", async (t) => {
  t.after(async () => {
    await db
      .delete(userPreferences)
      .where(eq(userPreferences.workosUserId, `user_${suffix}`));
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
  assert.equal(fetched?.baseAgentId, "conversational");
  assert.deepEqual(fetched?.enabledToolIds, ["web-search"]);
  assert.deepEqual(fetched?.approvalRules, { "web-search": "ask" });

  assert.deepEqual(await getUserPreferences(`user_${suffix}`), {
    sendMessageShortcut: "mod_enter",
  });
  await updateUserPreferences({
    workosUserId: `user_${suffix}`,
    sendMessageShortcut: "enter",
  });
  assert.deepEqual(await getUserPreferences(`user_${suffix}`), {
    sendMessageShortcut: "enter",
  });
  assert.equal(await getWorker(otherOrganizationId, created.id), undefined);
  assert.deepEqual(await getOrganizationPreferences(organizationId), {
    defaultWorkerId: null,
  });
  assert.equal(
    await updateOrganizationDefaultWorker({
      organizationId: otherOrganizationId,
      defaultWorkerId: created.id,
    }),
    undefined,
  );
  assert.deepEqual(
    await updateOrganizationDefaultWorker({
      organizationId,
      defaultWorkerId: created.id,
    }),
    { defaultWorkerId: created.id },
  );
  assert.deepEqual(await getOrganizationPreferences(organizationId), {
    defaultWorkerId: created.id,
  });

  const conversation = await createConversation({
    organizationId,
    workerId: created.id,
    createdByWorkosUserId: `user_${suffix}`,
    title: "Remember this question",
  });
  assert.ok(conversation);
  assert.deepEqual(
    await renameConversation({
      organizationId,
      workerId: created.id,
      conversationId: conversation.id,
      userId: `another_user_${suffix}`,
      title: "Forged rename",
    }),
    undefined,
  );
  assert.deepEqual(
    await renameConversation({
      organizationId,
      workerId: created.id,
      conversationId: conversation.id,
      userId: `user_${suffix}`,
      title: "Renamed conversation",
    }),
    { id: conversation.id, title: "Renamed conversation" },
  );
  assert.equal(
    await createConversation({
      organizationId: otherOrganizationId,
      workerId: created.id,
      createdByWorkosUserId: `user_${suffix}`,
    }),
    undefined,
  );
  assert.deepEqual(
    (await listConversations(organizationId, created.id, `user_${suffix}`)).map(
      (item) => item.id,
    ),
    [conversation.id],
  );

  assert.deepEqual(
    (await listOrganizationConversations(organizationId, `user_${suffix}`)).map(
      (item) => [item.id, item.title],
    ),
    [[conversation.id, "Renamed conversation"]],
  );
  assert.deepEqual(
    await listOrganizationConversations(
      organizationId,
      `another_user_${suffix}`,
    ),
    [],
  );
  assert.equal(
    (
      await getConversation(
        organizationId,
        created.id,
        conversation.id,
        `user_${suffix}`,
      )
    )?.id,
    conversation.id,
  );
  assert.equal(
    await getConversation(
      otherOrganizationId,
      created.id,
      conversation.id,
      `user_${suffix}`,
    ),
    undefined,
  );
  assert.equal(
    await getConversation(
      organizationId,
      created.id,
      conversation.id,
      `another_user_${suffix}`,
    ),
    undefined,
  );

  const project = await createProject({
    organizationId,
    userId: `user_${suffix}`,
    name: "Launch research",
    instructions: "Keep the work focused on launch evidence.",
  });
  assert.ok(project);
  assert.deepEqual(
    (await listProjects({ organizationId, userId: `user_${suffix}` })).map(
      (item) => item.name,
    ),
    ["Launch research"],
  );
  assert.equal(
    await getProject({
      organizationId,
      userId: `another_user_${suffix}`,
      projectId: project.id,
    }),
    undefined,
  );
  assert.equal(
    await addProjectConversation({
      organizationId,
      userId: `another_user_${suffix}`,
      projectId: project.id,
      conversationId: conversation.id,
    }),
    undefined,
  );
  assert.ok(
    await addProjectConversation({
      organizationId,
      userId: `user_${suffix}`,
      projectId: project.id,
      conversationId: conversation.id,
    }),
  );
  assert.deepEqual(
    (
      await listProjectConversations({
        organizationId,
        userId: `user_${suffix}`,
        projectId: project.id,
      })
    ).map((item) => item.id),
    [conversation.id],
  );
  assert.deepEqual(
    await listProjectConversations({
      organizationId,
      userId: `another_user_${suffix}`,
      projectId: project.id,
    }),
    [],
  );
  assert.equal(
    (
      await removeProjectConversation({
        organizationId,
        userId: `another_user_${suffix}`,
        projectId: project.id,
        conversationId: conversation.id,
      })
    )?.conversationId,
    undefined,
  );
  assert.equal(
    (
      await removeProjectConversation({
        organizationId,
        userId: `user_${suffix}`,
        projectId: project.id,
        conversationId: conversation.id,
      })
    )?.conversationId,
    conversation.id,
  );
  assert.deepEqual(
    await listProjectConversations({
      organizationId,
      userId: `user_${suffix}`,
      projectId: project.id,
    }),
    [],
  );
  assert.equal(
    await deleteProject({
      organizationId,
      userId: `another_user_${suffix}`,
      projectId: project.id,
    }),
    undefined,
  );
  assert.ok(
    await deleteProject({
      organizationId,
      userId: `user_${suffix}`,
      projectId: project.id,
    }),
  );
  assert.equal(
    await getProject({
      organizationId,
      userId: `user_${suffix}`,
      projectId: project.id,
    }),
    undefined,
  );
  assert.equal(
    (
      await getConversation(
        organizationId,
        created.id,
        conversation.id,
        `user_${suffix}`,
      )
    )?.id,
    conversation.id,
  );

  const task = await createTask({
    organizationId,
    createdByWorkosUserId: `user_${suffix}`,
    workerId: created.id,
    conversationId: conversation.id,
    title: "Document the answer",
    instructions: "Capture the answer in the project notes.",
  });
  assert.ok(task);
  assert.deepEqual(
    (
      await listConversationTasks({
        organizationId,
        conversationId: conversation.id,
        userId: `user_${suffix}`,
      })
    ).map((item) => item.title),
    ["Document the answer"],
  );
  assert.deepEqual(
    await listConversationTasks({
      organizationId,
      conversationId: conversation.id,
      userId: `another_user_${suffix}`,
    }),
    [],
  );
  assert.equal(
    await createTask({
      organizationId,
      createdByWorkosUserId: `another_user_${suffix}`,
      workerId: created.id,
      conversationId: conversation.id,
      title: "Forged task",
      instructions: "This must not be created.",
    }),
    undefined,
  );

  const userMessage = await createConversationMessage({
    organizationId,
    workerId: created.id,
    conversationId: conversation.id,
    createdByWorkosUserId: `user_${suffix}`,
    role: "user",
    content: "What did I ask you to remember?",
  });
  assert.ok(userMessage);

  const workerMessage = await createConversationMessage({
    organizationId,
    workerId: created.id,
    conversationId: conversation.id,
    createdByWorkosUserId: `user_${suffix}`,
    role: "worker",
    content: "You asked me to remember this question.",
    modelId: "kilo/kilo-auto/free",
    runtimeRunId: "run_test",
    latencyMs: 12,
    inputTokens: 8,
    outputTokens: 9,
    totalTokens: 17,
  });
  assert.ok(workerMessage);

  assert.deepEqual(
    (
      await listConversationMessages(
        organizationId,
        created.id,
        conversation.id,
        `user_${suffix}`,
      )
    )?.map((message) => message.content),
    [
      "What did I ask you to remember?",
      "You asked me to remember this question.",
    ],
  );
  assert.equal(
    await createConversationMessage({
      organizationId,
      workerId: created.id,
      conversationId: conversation.id,
      createdByWorkosUserId: `another_user_${suffix}`,
      role: "user",
      content: "Forged cross-member message.",
    }),
    undefined,
  );
  assert.equal(
    await listConversationMessages(
      organizationId,
      created.id,
      conversation.id,
      `another_user_${suffix}`,
    ),
    undefined,
  );

  const execution = await startExecution({
    organizationId,
    workerId: created.id,
    conversationId: conversation.id,
  });
  assert.ok(execution);
  await appendToolActivity({
    organizationId,
    executionId: execution.id,
    toolId: "web-search",
    toolCallId: "tool-call-1",
    state: "started",
  });
  await appendToolActivity({
    organizationId,
    executionId: execution.id,
    toolId: "web-search",
    toolCallId: "tool-call-1",
    state: "completed",
  });
  assert.deepEqual(
    (
      await listConversationActivity(
        organizationId,
        conversation.id,
        `user_${suffix}`,
      )
    )
      .slice(1, 3)
      .map((event) => [
        event.type,
        event.toolId,
        event.toolCallId,
        event.summary,
      ]),
    [
      ["tool.started", "web-search", "tool-call-1", "Searching the web…"],
      [
        "tool.completed",
        "web-search",
        "tool-call-1",
        "Searching the web completed",
      ],
    ],
  );

  await finishExecution({
    organizationId,
    executionId: execution.id,
    conversationMessageId: workerMessage.id,
    runtimeRunId: "run_test",
  });
  assert.deepEqual(
    (
      await listConversationActivity(
        organizationId,
        conversation.id,
        `user_${suffix}`,
      )
    ).map((event) => [event.type, event.summary]),
    [
      ["execution.started", "Generating a response"],
      ["tool.started", "Searching the web…"],
      ["tool.completed", "Searching the web completed"],
      ["execution.completed", "Response completed"],
    ],
  );

  const failedExecution = await startExecution({
    organizationId,
    workerId: created.id,
    conversationId: conversation.id,
  });
  assert.ok(failedExecution);
  await finishExecution({
    organizationId,
    executionId: failedExecution.id,
    errorMessage: "Runtime generation failed",
  });
  assert.deepEqual(
    (
      await listConversationActivity(
        organizationId,
        conversation.id,
        `user_${suffix}`,
      )
    )
      .slice(-2)
      .map((event) => [event.type, event.conversationMessageId]),
    [
      ["execution.started", null],
      ["execution.failed", null],
    ],
  );
  assert.deepEqual(
    await listConversationActivity(
      otherOrganizationId,
      conversation.id,
      `user_${suffix}`,
    ),
    [],
  );

  assert.equal(
    await createConversationMessage({
      organizationId: otherOrganizationId,
      workerId: created.id,
      conversationId: conversation.id,
      createdByWorkosUserId: `user_${suffix}`,
      role: "user",
      content: "Forged cross-organization message.",
    }),
    undefined,
  );
  assert.equal(
    await listConversationMessages(
      otherOrganizationId,
      created.id,
      conversation.id,
      `user_${suffix}`,
    ),
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
