/**
 * Per-user platform-model usage, tracked as an append-only ledger (windows
 * computed at read time from `createdAt`, not a pre-aggregated counter —
 * avoids reset-boundary/clock-skew bugs a counter-reset design would have)
 * so a 5-hour and a weekly rolling allowance can both be read from the same
 * rows. Only `source: "platform"` rows ever count against a limit — BYOK
 * usage is the user's own cost and is recorded here purely for their own
 * visibility, never enforced against.
 */
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { executions } from "./executions";
import { organizations } from "./organizations";

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => executions.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull(),
    source: text("source").$type<"platform" | "byok">().notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: numeric("cost_usd"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("usage_events_user_source_created_at_index").on(
      table.userId,
      table.source,
      table.createdAt,
    ),
  ],
);

export const usageLimitPolicies = pgTable("usage_limit_policies", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  // Null means unlimited — never a hardcoded constant.
  fiveHourTokenLimit: integer("five_hour_token_limit"),
  weeklyTokenLimit: integer("weekly_token_limit"),
  updatedByWorkosUserId: text("updated_by_workos_user_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
