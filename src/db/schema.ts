import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const members = pgTable(
  "members",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workosUserId: text("workos_user_id").notNull(),
    workosMembershipId: text("workos_membership_id").notNull(),
    email: text("email").notNull(),
    roleSlug: text("role_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.workosUserId] }),
    unique("members_workos_membership_id_unique").on(table.workosMembershipId),
  ],
);

export const userPreferences = pgTable("user_preferences", {
  workosUserId: text("workos_user_id").primaryKey(),
  sendMessageShortcut: text("send_message_shortcut")
    .$type<"enter" | "mod_enter">()
    .notNull()
    .default("mod_enter"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workers = pgTable(
  "workers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    instructions: text("instructions").notNull(),
    modelId: text("model_id").notNull(),
    baseAgentId: text("base_agent_id").notNull().default("conversational"),
    goals: text("goals"),
    tone: text("tone"),
    outputFormat: text("output_format"),
    enabledToolIds: jsonb("enabled_tool_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    knowledgeSourceIds: jsonb("knowledge_source_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    approvalRules: jsonb("approval_rules")
      .$type<Record<string, "ask" | "allow" | "deny" | "auto-classifier">>()
      .notNull()
      .default({}),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("workers_organization_name_unique").on(
      table.organizationId,
      table.name,
    ),
    index("workers_organization_created_at_index").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);

export const organizationPreferences = pgTable("organization_preferences", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  defaultWorkerId: uuid("default_worker_id").references(() => workers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("conversations_organization_worker_created_at_index").on(
      table.organizationId,
      table.workerId,
      table.createdAt,
    ),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    name: text("name").notNull(),
    instructions: text("instructions"),
    sharedMemoryEnabled: boolean("shared_memory_enabled")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("projects_organization_creator_name_unique").on(
      table.organizationId,
      table.createdByWorkosUserId,
      table.name,
    ),
    index("projects_organization_creator_updated_at_index").on(
      table.organizationId,
      table.createdByWorkosUserId,
      table.updatedAt,
    ),
  ],
);

export const projectConversations = pgTable(
  "project_conversations",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.conversationId] }),
    unique("project_conversations_conversation_id_unique").on(
      table.conversationId,
    ),
    index("project_conversations_conversation_id_index").on(
      table.conversationId,
    ),
  ],
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "worker">().notNull(),
    content: text("content").notNull(),
    modelId: text("model_id"),
    runtimeRunId: text("runtime_run_id"),
    latencyMs: integer("latency_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("conversation_messages_conversation_created_at_index").on(
      table.conversationId,
      table.createdAt,
    ),
    index("conversation_messages_organization_created_at_index").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);

export const conversationAttachments = pgTable(
  "conversation_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    pathname: text("pathname").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("conversation_attachments_pathname_unique").on(table.pathname),
    index("conversation_attachments_conversation_creator_created_at_index").on(
      table.conversationId,
      table.createdByWorkosUserId,
      table.createdAt,
    ),
  ],
);

export const executions = pgTable(
  "executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    runtimeRunId: text("runtime_run_id"),
    status: text("status")
      .$type<"running" | "awaiting_approval" | "completed" | "failed">()
      .notNull(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("executions_organization_started_at_index").on(
      table.organizationId,
      table.startedAt,
    ),
    index("executions_conversation_started_at_index").on(
      table.conversationId,
      table.startedAt,
    ),
  ],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => executions.id, { onDelete: "cascade" }),
    conversationMessageId: uuid("conversation_message_id").references(
      () => conversationMessages.id,
      { onDelete: "cascade" },
    ),
    type: text("type")
      .$type<
        | "execution.started"
        | "execution.completed"
        | "execution.failed"
        | "tool.started"
        | "tool.completed"
        | "tool.failed"
        | "tool.awaiting_approval"
      >()
      .notNull(),
    toolId: text("tool_id"),
    toolCallId: text("tool_call_id"),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_events_execution_created_at_index").on(
      table.executionId,
      table.createdAt,
    ),
    index("activity_events_organization_created_at_index").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status")
      .$type<"active" | "completed" | "cancelled">()
      .notNull()
      .default("active"),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("goals_organization_created_at_index").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id").references(() => goals.id, {
      onDelete: "set null",
    }),
    workerId: uuid("worker_id").references(() => workers.id, {
      onDelete: "set null",
    }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    status: text("status")
      .$type<
        | "draft"
        | "ready"
        | "running"
        | "awaiting_approval"
        | "completed"
        | "cancelled"
        | "failed"
      >()
      .notNull()
      .default("draft"),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tasks_organization_updated_at_index").on(
      table.organizationId,
      table.updatedAt,
    ),
    index("tasks_conversation_updated_at_index").on(
      table.conversationId,
      table.updatedAt,
    ),
  ],
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    executionId: uuid("execution_id").references(() => executions.id, {
      onDelete: "set null",
    }),
    runtimeRunId: text("runtime_run_id"),
    toolCallId: text("tool_call_id"),
    summary: text("summary").notNull(),
    status: text("status")
      .$type<"pending" | "deciding" | "approved" | "rejected" | "cancelled">()
      .notNull()
      .default("pending"),
    decidedByWorkosUserId: text("decided_by_workos_user_id"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("approvals_organization_status_index").on(
      table.organizationId,
      table.status,
    ),
    uniqueIndex("approvals_execution_runtime_tool_call_unique").on(
      table.executionId,
      table.runtimeRunId,
      table.toolCallId,
    ),
  ],
);
