/**
 * Durable run state for a turn, tracked separately from `executions` (which
 * is only the turn's HTTP-call-scoped reservation). One row exists per
 * turn's execution, carrying a step budget, a cancellation flag, and enough
 * timestamps to detect and close out a run abandoned by a crash — plus
 * `needs_continuation`, set when a turn is cut off by its own internal time
 * budget rather than finishing or failing, so it can be resumed by the
 * `/api/cron/continue-runs` sweep instead of being lost. See ADR-0025 and
 * ADR-0026.
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

export const agentRuns = pgTable(
  "agent_runs",
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
      .$type<
        | "running"
        | "cancelling"
        | "cancelled"
        | "completed"
        | "failed"
        | "needs_continuation"
      >()
      .notNull(),
    maxSteps: integer("max_steps").notNull(),
    stepCount: integer("step_count").default(0).notNull(),
    continuationCount: integer("continuation_count").default(0).notNull(),
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
    uniqueIndex("agent_runs_execution_id_unique").on(table.executionId),
    index("agent_runs_conversation_started_at_index").on(
      table.conversationId,
      table.startedAt,
    ),
    index("agent_runs_organization_status_index").on(
      table.organizationId,
      table.status,
    ),
  ],
);
