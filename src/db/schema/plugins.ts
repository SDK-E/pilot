/**
 * Organization-defined plugins: a distribution unit that bundles existing
 * commands and/or tool grants into one thing an admin can grant to an
 * agent, the same way a skill is granted (`workers.enabledPluginIds`,
 * mirroring `workers.enabledSkillIds`). `commandIds` (referencing
 * `commands.id`) documents which commands this plugin ships as a bundle;
 * every command is already visible to every agent regardless (see
 * commands.ts), so granting the plugin is only what gates `toolIds`.
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

export const plugins = pgTable(
  "plugins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    commandIds: jsonb("command_ids").$type<string[]>().notNull().default([]),
    toolIds: jsonb("tool_ids").$type<string[]>().notNull().default([]),
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
    unique("plugins_organization_name_unique").on(
      table.organizationId,
      table.name,
    ),
    index("plugins_organization_created_at_index").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);
