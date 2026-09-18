/**
 * Durable run state for Work-kind conversations, tracked separately from
 * `executions` (which is turn-scoped and shared by every agent kind). One
 * row exists per Work turn's execution, carrying the state a Work run needs
 * that Chat and Code never do: a step budget, a cancellation flag, and
 * enough timestamps to detect and close out a run abandoned by a crash.
 */
import {
  index,
  integer,
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

export const workRuns = pgTable(
  "work_runs",
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
    executionId: uuid("execution_id")
      .notNull()
      .references(() => executions.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<"running" | "cancelling" | "cancelled" | "completed" | "failed">()
      .notNull(),
    maxSteps: integer("max_steps").notNull(),
    stepCount: integer("step_count").default(0).notNull(),
    cancelRequestedAt: timestamp("cancel_requested_at", {
      withTimezone: true,
    }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
  },
  (table) => [
    uniqueIndex("work_runs_execution_id_unique").on(table.executionId),
    index("work_runs_conversation_started_at_index").on(
      table.conversationId,
      table.startedAt,
    ),
    index("work_runs_organization_status_index").on(
      table.organizationId,
      table.status,
    ),
  ],
);
