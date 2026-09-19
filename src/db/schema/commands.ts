/**
 * Organization-defined commands: a named, slash-triggerable saved prompt
 * template — a reusable instruction shortcut with no tool grants of its
 * own (a bundle of tool grants plus commands is a plugin, see plugins.ts).
 * Every command an org authors is available in every agent's composer
 * palette; a command has nothing to gate since it carries no tool grant.
 */
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

export const commands = pgTable(
  "commands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    // May include `{placeholder}` tokens the composer prompts for before
    // expanding the command into the draft.
    promptTemplate: text("prompt_template").notNull(),
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
    unique("commands_organization_name_unique").on(
      table.organizationId,
      table.name,
    ),
    index("commands_organization_created_at_index").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);
