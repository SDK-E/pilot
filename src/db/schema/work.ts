/**
 * Tasks and the approvals Pilot pauses on before using a tool.
 */
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { workers } from "./agents";
import { conversations } from "./conversations";
import { executions } from "./executions";
import { organizations } from "./organizations";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
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
    toolId: text("tool_id"),
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
