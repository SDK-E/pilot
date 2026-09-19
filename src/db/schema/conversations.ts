/**
 * Creator-scoped conversations and everything attached to them.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { workers } from "./agents";
import { organizations } from "./organizations";

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
    // Instructions scoped to just this conversation — the narrowest
    // instruction tier, appended on top of organization/user/project ones.
    instructions: text("instructions"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    status: text("status")
      .$type<"active" | "deleting">()
      .notNull()
      .default("active"),
  },
  (table) => [
    index("conversations_organization_worker_created_at_index").on(
      table.organizationId,
      table.workerId,
      table.createdAt,
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
    // A worker-role reply Pilot generated after a turn failed, so the client
    // can style it distinctly instead of leaving the user's message orphaned.
    isError: boolean("is_error").notNull().default(false),
    // A worker-role reply cut short by a user-initiated stop, holding
    // whatever text had streamed so far. The client offers a Continue action
    // only while this is true and the message is still the last in the
    // conversation; a completed continuation clears it.
    isPartial: boolean("is_partial").notNull().default(false),
    userQuestionOptions: jsonb("user_question_options").$type<
      { label: string; description?: string }[]
    >(),
    userQuestionSelectionMode: text("user_question_selection_mode").$type<
      "single_select" | "multi_select"
    >(),
    modelId: text("model_id"),
    runtimeRunId: text("runtime_run_id"),
    latencyMs: integer("latency_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),
    // What was active on this turn (composer per-message toggle/picker),
    // persisted so past turns can show what produced their reply and so an
    // edit-and-resend can reconstruct the same selection.
    skillIds: jsonb("skill_ids").$type<string[]>().notNull().default([]),
    connectorToolIds: jsonb("connector_tool_ids").$type<string[]>(),
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

export const conversationSources = pgTable(
  "conversation_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => conversationMessages.id, { onDelete: "cascade" }),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    title: text("title").notNull(),
    domain: text("domain").notNull(),
    url: text("url").notNull(),
    summary: text("summary").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("conversation_sources_message_index").on(table.messageId),
    index("conversation_sources_conversation_creator_index").on(
      table.conversationId,
      table.createdByWorkosUserId,
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
    // Which turn this attachment was added on. Nullable for rows created
    // before this column existed, and for uploads made before the composer's
    // first message has actually been sent — those stay conversation-scoped.
    messageId: uuid("message_id").references(() => conversationMessages.id, {
      onDelete: "cascade",
    }),
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
    index("conversation_attachments_message_index").on(table.messageId),
    index("conversation_attachments_conversation_creator_created_at_index").on(
      table.conversationId,
      table.createdByWorkosUserId,
      table.createdAt,
    ),
  ],
);

export const conversationScratchpads = pgTable(
  "conversation_scratchpads",
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
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("conversation_scratchpads_conversation_unique").on(
      table.conversationId,
    ),
    index("conversation_scratchpads_organization_updated_at_index").on(
      table.organizationId,
      table.updatedAt,
    ),
  ],
);

export interface ConversationPlanStep {
  id: string;
  text: string;
  status: "pending" | "in_progress" | "done";
}

export const conversationPlans = pgTable(
  "conversation_plans",
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
    steps: jsonb("steps").$type<ConversationPlanStep[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("conversation_plans_conversation_unique").on(
      table.conversationId,
    ),
    index("conversation_plans_organization_updated_at_index").on(
      table.organizationId,
      table.updatedAt,
    ),
  ],
);
