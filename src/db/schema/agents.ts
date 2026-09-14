/**
 * Configured agents (stored in the `workers` table) and the organization's default agent.
 */
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

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
    baseAgentId: text("base_agent_id")
      .$type<"chat" | "work" | "code">()
      .notNull()
      .default("chat"),
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
      .$type<Record<string, "ask" | "allow" | "deny">>()
      .notNull()
      .default({}),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    archived: boolean("archived").notNull().default(false),
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
  primaryModelId: text("primary_model_id")
    .notNull()
    .default("kilo/kilo-auto/free"),
  retryEnabled: boolean("retry_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
