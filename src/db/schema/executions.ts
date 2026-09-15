/**
 * One execution per model turn, with its sanitized activity trail.
 */
import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { workers } from "./agents";
import { conversationMessages, conversations } from "./conversations";
import { organizations } from "./organizations";

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
      .$type<"running" | "completed" | "failed">()
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
    // A retried or duplicated POST to the stream route must not open a second
    // turn on top of one already in flight, which is what let each retry
    // persist another duplicate user message. Scoped to the two non-terminal
    // statuses so a conversation can still start a new turn once the previous
    // one has completed or failed.
    uniqueIndex("executions_conversation_active_unique")
      .on(table.conversationId)
      .where(sql`${table.status} = 'running'`),
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
        | "skill.selected"
        | "tool.started"
        | "tool.completed"
        | "tool.failed"
      >()
      .notNull(),
    toolId: text("tool_id"),
    toolCallId: text("tool_call_id"),
    summary: text("summary").notNull(),
    detail: text("detail"),
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
